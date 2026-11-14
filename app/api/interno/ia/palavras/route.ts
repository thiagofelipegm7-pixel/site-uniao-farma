import { chaveDoNome } from "../../../../nomes-corrigidos";
import { conteudoDaRespostaIA, criarLimitador } from "../../../../busca-ia-nucleo";
import { disparar } from "./disparo";
import { banco, segredo } from "../../../../estoque-fonte";
import { chamarGeminiComMotivo, esquemaParaGemini, MODELO_GEMINI_TEXTO, modeloEscolhido } from "../../../../gemini-nucleo";
import { carregarCatalogoCompleto } from "../../../../nacoes-unidas/produtos/catalogo";
import { carregarRestritos } from "../../../../nacoes-unidas/produtos/receita";
import { chavesTentadas, definirPalavras, ESQUEMA_PALAVRAS, lerLotePalavras, mapaDePalavras, marcarTentadas, PROMPT_PALAVRAS, PROMPT_PALAVRAS_MEDICAMENTO } from "../../../../palavras-busca";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
// "Gerar tudo" chama uma rodada atrás da outra (60 itens cada): 40 por 10 minutos, só equipe logada.
const limite = criarLimitador(40, 600_000);
const POR_PEDIDO = 60;
const POR_CHAMADA = 15;
const EM_PARALELO = 4;

type Alvo = { nome: string; categoria: string; ativo?: string; medicamento: boolean };

/** O que ainda não tem palavras. Remédios (OTC, receita e controlados) usam um pedido mais restrito: só princípio ativo, marca equivalente e grafia comum. */
async function faltando() {
  const db = banco();
  if (!db) return null;
  const feitas = await mapaDePalavras(db);
  const tentadas = await chavesTentadas(db);
  const vistos = new Set<string>();
  const produtos: Alvo[] = [];
  const medicamentos: Alvo[] = [];
  const r = carregarRestritos();
  const restritos = [...r.receita, ...r.controlados, ...r.consulte];
  const chavesRestritos = new Set(restritos.map((i) => chaveDoNome(i.nome)));
  for (const i of carregarCatalogoCompleto().itens) {
    const k = chaveDoNome(i.nome);
    if (vistos.has(k) || feitas[k] || tentadas.has(k)) continue;
    vistos.add(k);
    const remedio = i.isMIP || i.categoria === "Medicamentos" || chavesRestritos.has(k);
    (remedio ? medicamentos : produtos).push({ nome: i.nome, categoria: i.categoria, medicamento: remedio });
  }
  for (const i of restritos) {
    const k = chaveDoNome(i.nome);
    if (vistos.has(k) || feitas[k] || tentadas.has(k)) continue;
    vistos.add(k);
    medicamentos.push({ nome: i.nome, categoria: "Medicamentos", ativo: i.ativo ?? undefined, medicamento: true });
  }
  return { db, produtos, medicamentos, lista: [...produtos, ...medicamentos], comPalavras: Object.keys(feitas).length };
}

/** Gera palavras de busca para até 60 itens por pedido (só equipe logada): primeiro os produtos, depois os remédios. Entram na busca na próxima publicação. */
export async function POST(request: Request) {
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) return Response.json({ ok: false, erro: "sem_ia" }, { status: 501, headers: SEM_CACHE });
  if (!limite(request.headers.get("cf-connecting-ip") ?? "equipe")) return Response.json({ ok: false, erro: "limite" }, { status: 429, headers: SEM_CACHE });
  const f = await faltando();
  if (!f) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const escolhidos = f.lista.slice(0, POR_PEDIDO);
  // Cada chamada leva só um tipo (produto ou remédio), porque o pedido e as regras são diferentes.
  const grupos: Alvo[][] = [];
  for (const tipo of [false, true]) {
    const deste = escolhidos.filter((x) => x.medicamento === tipo);
    for (let i = 0; i < deste.length; i += POR_CHAMADA) grupos.push(deste.slice(i, i + POR_CHAMADA));
  }
  let salvos = 0;
  let semPalavras = 0;
  const semSeguras: string[] = [];
  let falhas = 0;
  let motivo = "";
  for (let g = 0; g < grupos.length; g += EM_PARALELO) {
    await Promise.all(
      grupos.slice(g, g + EM_PARALELO).map(async (grupo) => {
        const remedio = grupo[0]?.medicamento === true;
        const r = await chamarGeminiComMotivo({
          modelo: modeloEscolhido(segredo("GEMINI_MODELO_PAINEL"), MODELO_GEMINI_TEXTO),
          chave,
          sistema: remedio ? PROMPT_PALAVRAS_MEDICAMENTO : PROMPT_PALAVRAS,
          texto: JSON.stringify({ itens: grupo.map((p, i) => (remedio ? { i: i + 1, nome: p.nome, ativo: p.ativo ?? "" } : { i: i + 1, nome: p.nome, categoria: p.categoria })) }),
          maxTokens: 2000,
          ms: 25_000,
          esquema: esquemaParaGemini(ESQUEMA_PALAVRAS),
        });
        if (!r.ok) {
          falhas += grupo.length;
          motivo = r.motivo;
          return;
        }
        const lido = lerLotePalavras(conteudoDaRespostaIA({ response: r.response }), grupo.map((p) => p.nome), remedio);
        for (let i = 0; i < grupo.length; i++) {
          const palavras = lido.get(i + 1) ?? [];
          if (palavras.length === 0) {
            semPalavras++;
            semSeguras.push(grupo[i].nome);
            continue;
          }
          if (await definirPalavras(f.db, grupo[i].nome, palavras, "ia", "gemini")) salvos++;
        }
      }),
    );
  }
  if (semSeguras.length > 0) await marcarTentadas(f.db, semSeguras);
  if (salvos > 0) await disparar(f.db);
  return Response.json({ ok: true, salvos, semPalavras, falhas, motivo: falhas ? motivo : undefined, restantes: Math.max(0, f.lista.length - salvos - semSeguras.length) }, { headers: SEM_CACHE });
}

/** Quantos produtos já têm palavras e quantos faltam. */
export async function GET() {
  const f = await faltando();
  if (!f) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  return Response.json({ ok: true, comPalavras: f.comPalavras, faltam: f.lista.length, faltamProdutos: f.produtos.length, faltamMedicamentos: f.medicamentos.length, ia: Boolean(segredo("GEMINI_API_KEY")) }, { headers: SEM_CACHE });
}
