import { env } from "cloudflare:workers";
import { registrarUsoIA } from "../../ia-uso";
import { segredo } from "../../estoque-fonte";
import { carregarCatalogoCompleto } from "../../nacoes-unidas/produtos/catalogo";
import { ehNbcal } from "../../nacoes-unidas/produtos/produto";
import { carregarRestritos } from "../../nacoes-unidas/produtos/receita";
import { ehFormulaInfantil } from "../../nacoes-unidas/produtos/relacionados";
import { ESQUEMA_INTENCAO, montarEntradaIntencao, PROMPT_INTENCAO, vocabularioDeProdutos } from "../../busca-intencao-nucleo";
import { chamarGemini, esquemaParaGemini, MODELO_GEMINI_TEXTO, modeloEscolhido } from "../../gemini-nucleo";
import {
  candidatosValidos,
  conteudoDaRespostaIA,
  consultaValida,
  criarLimitador,
  ESQUEMA_RESPOSTA,
  limparRespostaIA,
  MODELO_IA,
  montarEntrada,
  PROMPT_SISTEMA,
  type RespostaBuscaIA,
} from "../../busca-ia-nucleo";

export const dynamic = "force-dynamic";

/** Tempo máximo esperando o modelo. Passou disso, a resposta é vazia e a busca normal segue sozinha. */
const TEMPO_LIMITE_MS = 2000;
/** A busca por intenção manda a lista de palavras do catálogo, então o modelo leva um pouco mais. */
const TEMPO_INTENCAO_MS = 2800;
/** Quanto o Gemini pode levar antes de passar a vez para a IA da Cloudflare (o teto total de 2 s continua valendo). */
const TEMPO_GEMINI_MS = 1500;
/** Cada visitante: 12 pedidos por minuto. Todo o site: 600 por hora por instância (teto de custo, ~US$ 0,015/h). */
const limitePorVisitante = criarLimitador(12, 60_000);
const limiteGeral = criarLimitador(600, 3_600_000);
const CACHE_SEGUNDOS = 60 * 60 * 24 * 30;

type Ia = { run(modelo: string, entrada: Record<string, unknown>): Promise<unknown> };

let vocabIntencao: string[] | null = null;
/** Palavras de produtos que NÃO são medicamento, controlado, NBCAL nem fórmula infantil: a busca por intenção só escolhe entre elas. */
function vocabularioSemRestritos(): string[] {
  if (vocabIntencao) return vocabIntencao;
  const r = carregarRestritos();
  const restritos = new Set([...r.receita, ...r.controlados, ...r.consulte].map((i) => i.nome));
  const nomes = carregarCatalogoCompleto()
    .itens.filter((i) => !i.isMIP && i.categoria !== "Medicamentos" && !restritos.has(i.nome) && !ehNbcal(i.nome) && !ehFormulaInfantil(i.nome))
    .map((i) => i.nome);
  vocabIntencao = vocabularioDeProdutos(nomes);
  return vocabIntencao;
}

const VAZIA: RespostaBuscaIA = { termos: [], sintoma: false };

function responder(corpo: RespostaBuscaIA, extra: Record<string, string> = {}) {
  registrarUsoIA("busca", extra["x-busca-ia"]);
  return Response.json(corpo, { headers: { "cache-control": "no-store", ...extra } });
}

/**
 * Reescreve uma busca digitada errado em palavras que existem no catálogo.
 * A IA só escolhe entre as palavras candidatas que o navegador mandou (já filtradas pelo catálogo) e nunca recomenda remédio.
 * Qualquer problema (sem IA, limite, tempo, resposta estranha) devolve vazio: a busca segue sem IA e sem erro na tela.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const texto = consultaValida(url.searchParams.get("q"));
  const intencao = url.searchParams.get("modo") === "intencao";
  const candidatos = intencao ? [] : candidatosValidos(url.searchParams.get("c"));
  if (!texto || (!intencao && candidatos.length === 0)) return responder(VAZIA);

  const ia = (env as { AI?: Ia }).AI;
  const chaveGemini = segredo("GEMINI_API_KEY");
  if (!ia && !chaveGemini) return responder(VAZIA, { "x-busca-ia": "sem-binding" });
  // Busca por intenção precisa do Gemini; sem a chave, a busca segue só com a correção de digitação.
  if (intencao && !chaveGemini) return responder(VAZIA, { "x-busca-ia": "sem-binding" });
  const palavrasIntencao = intencao ? vocabularioSemRestritos() : [];

  // Mesmo texto + mesmos candidatos = mesma resposta: vem do cache da Cloudflare, sem gastar IA.
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const chaveCache = new Request(`https://busca-ia.cache.local/${intencao ? "intencao-v1" : "v1"}/${encodeURIComponent(texto)}/${candidatos.join(",")}`);
  try {
    const guardada = await cache?.match(chaveCache);
    if (guardada) return responder((await guardada.json()) as RespostaBuscaIA, { "x-busca-ia": "cache" });
  } catch {
    // cache indisponível: segue sem ele
  }

  const visitante = request.headers.get("cf-connecting-ip") ?? "anonimo";
  if (!limitePorVisitante(visitante) || !limiteGeral("geral")) return responder(VAZIA, { "x-busca-ia": "limite" });

  try {
    let falhou = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<null>((resolve) => {
      temporizador = setTimeout(() => resolve(null), intencao ? TEMPO_INTENCAO_MS : TEMPO_LIMITE_MS);
    });
    // Com a chave do Gemini cadastrada, ele responde; se falhar, a IA da Cloudflare ainda tem o resto do tempo.
    const viaCloudflare = () =>
      ia
        ? ia
            .run(MODELO_IA, {
              messages: [
                { role: "system", content: PROMPT_SISTEMA },
                { role: "user", content: montarEntrada(texto, candidatos) },
              ],
              max_tokens: 80,
              temperature: 0,
              response_format: ESQUEMA_RESPOSTA,
            })
            .catch(() => {
              falhou = true;
              return null;
            })
        : Promise.resolve(null);
    const chamada: Promise<unknown> = intencao
      ? chamarGemini({
          modelo: modeloEscolhido(segredo("GEMINI_MODELO"), MODELO_GEMINI_TEXTO),
          chave: chaveGemini,
          sistema: PROMPT_INTENCAO,
          texto: montarEntradaIntencao(texto, palavrasIntencao),
          maxTokens: 120,
          ms: TEMPO_INTENCAO_MS - 100,
          esquema: esquemaParaGemini(ESQUEMA_INTENCAO),
        })
      : chaveGemini
      ? chamarGemini({
          modelo: modeloEscolhido(segredo("GEMINI_MODELO"), MODELO_GEMINI_TEXTO),
          chave: chaveGemini,
          sistema: PROMPT_SISTEMA,
          texto: montarEntrada(texto, candidatos),
          maxTokens: 120,
          ms: TEMPO_GEMINI_MS,
          esquema: esquemaParaGemini(ESQUEMA_RESPOSTA),
        }).then((r) => r ?? viaCloudflare())
      : viaCloudflare();
    const resultado = await Promise.race([chamada, limite]);
    if (temporizador) clearTimeout(temporizador);
    if (resultado === null) return responder(VAZIA, { "x-busca-ia": falhou ? "erro-ia" : "tempo" });

    const limpa = limparRespostaIA(conteudoDaRespostaIA(resultado), intencao ? palavrasIntencao : candidatos);
    if (!limpa) return responder(VAZIA, { "x-busca-ia": "invalida" });

    try {
      await cache?.put(chaveCache, Response.json(limpa, { headers: { "cache-control": `public, max-age=${CACHE_SEGUNDOS}` } }));
    } catch {
      // sem cache, só gasta mais um pouco
    }
    return responder(limpa, { "x-busca-ia": "ia" });
  } catch {
    return responder(VAZIA, { "x-busca-ia": "erro" });
  }
}
