import { env } from "cloudflare:workers";
import { registrarUsoIA } from "../../ia-uso";
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
/** Cada visitante: 12 pedidos por minuto. Todo o site: 600 por hora por instância (teto de custo, ~US$ 0,015/h). */
const limitePorVisitante = criarLimitador(12, 60_000);
const limiteGeral = criarLimitador(600, 3_600_000);
const CACHE_SEGUNDOS = 60 * 60 * 24 * 30;

type Ia = { run(modelo: string, entrada: Record<string, unknown>): Promise<unknown> };

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
  const candidatos = candidatosValidos(url.searchParams.get("c"));
  if (!texto || candidatos.length === 0) return responder(VAZIA);

  const ia = (env as { AI?: Ia }).AI;
  if (!ia) return responder(VAZIA, { "x-busca-ia": "sem-binding" });

  // Mesmo texto + mesmos candidatos = mesma resposta: vem do cache da Cloudflare, sem gastar IA.
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
  const chaveCache = new Request(`https://busca-ia.cache.local/v1/${encodeURIComponent(texto)}/${candidatos.join(",")}`);
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
      temporizador = setTimeout(() => resolve(null), TEMPO_LIMITE_MS);
    });
    const chamada = ia
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
      });
    const resultado = await Promise.race([chamada, limite]);
    if (temporizador) clearTimeout(temporizador);
    if (resultado === null) return responder(VAZIA, { "x-busca-ia": falhou ? "erro-ia" : "tempo" });

    const limpa = limparRespostaIA(conteudoDaRespostaIA(resultado), candidatos);
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
