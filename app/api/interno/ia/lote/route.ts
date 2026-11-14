import { criarLimitador } from "../../../../busca-ia-nucleo";
import { banco, segredo } from "../../../../estoque-fonte";
import { mapaDeDescricoes } from "../../../../descricao-override";
import { chavesJaTratadas, guardarSugestao, paraRefazer } from "../../../../ia-fila";
import { elegiveis } from "../../../../ia-lote-elegiveis";
import { sugerirProduto } from "../../../../ia-sugestao-servidor";
import { carregarCatalogoCompleto } from "../../../../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../../../../nacoes-unidas/produtos/imagens";
import { carregarRestritos } from "../../../../nacoes-unidas/produtos/receita";
import { chaveDoNome } from "../../../../nomes-corrigidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const limite = criarLimitador(6, 600_000);
const MAX_POR_LOTE = 10;
const EM_PARALELO = 4;

/** Dados do que falta e do que está na fila (só equipe logada). */
async function situacao() {
  const db = banco();
  if (!db) return null;
  const catalogo = carregarCatalogoCompleto();
  const r = carregarRestritos();
  const lista = elegiveis({
    itens: catalogo.itens,
    restritos: [...r.receita, ...r.controlados, ...r.consulte].map((i) => i.nome),
    jaTratadas: await chavesJaTratadas(db),
    comDescricaoPainel: new Set(Object.keys(await mapaDeDescricoes(db))),
    temFoto: (n) => fotoDoProduto(n) !== null,
  });
  return { db, catalogo, lista };
}

/** Gera até 10 sugestões de descrição (e marca, se faltar) para produtos sem descrição e as põe na fila de revisão. Não publica nada. */
export async function POST(request: Request) {
  if (!segredo("GEMINI_API_KEY")) return Response.json({ ok: false, erro: "sem_ia" }, { status: 501, headers: SEM_CACHE });
  if (!limite(request.headers.get("cf-connecting-ip") ?? "equipe")) return Response.json({ ok: false, erro: "limite" }, { status: 429, headers: SEM_CACHE });
  let n = MAX_POR_LOTE;
  let refazer = false;
  try {
    const c = (await request.json()) as { quantidade?: unknown; refazer?: unknown };
    refazer = c.refazer === true;
    if (typeof c.quantidade === "number" && c.quantidade >= 1) n = Math.min(MAX_POR_LOTE, Math.floor(c.quantidade));
  } catch {
    // corpo vazio: usa o padrão
  }
  const s = await situacao();
  if (!s) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const lista = refazer ? await paraRefazer(s.db) : s.lista;
  const escolhidos = lista.slice(0, n);
  const porNome = new Map(s.catalogo.itens.map((i) => [chaveDoNome(i.nome), i]));
  let geradas = 0;
  let semSugestao = 0;
  let falhas = 0;
  let motivo = "";
  for (let i = 0; i < escolhidos.length; i += EM_PARALELO) {
    await Promise.all(
      escolhidos.slice(i, i + EM_PARALELO).map(async (original) => {
        const item = porNome.get(chaveDoNome(original));
        const lab = (item?.lab ?? "").trim();
        const r = await sugerirProduto({ original, marca: lab, categoria: item?.categoria ?? "", permitirDescricao: true, ms: 15_000 });
        if (r.ok && r.sugestao.descricao) {
          await guardarSugestao(s.db, original, r.sugestao.descricao, lab ? "" : (r.sugestao.marca ?? ""), "pendente", (r.fontes ?? []).join(", "));
          geradas++;
        } else if (r.ok || r.erro === "sem_sugestao") {
          // A IA respondeu mas nada passou nas regras: marca como tratado para não tentar de novo e travar a fila.
          await guardarSugestao(s.db, original, "", "", "sem_sugestao");
          semSugestao++;
        } else {
          falhas++;
          motivo = r.motivo ?? r.erro;
        }
      }),
    );
  }
  return Response.json({ ok: true, geradas, semSugestao, falhas, motivo: falhas ? motivo : undefined, restantes: Math.max(0, lista.length - geradas - semSugestao) }, { headers: SEM_CACHE });
}

/** Quantos produtos ainda faltam receber sugestão. */
export async function GET() {
  const s = await situacao();
  if (!s) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  return Response.json({ ok: true, restantes: s.lista.length, ia: Boolean(segredo("GEMINI_API_KEY")) }, { headers: SEM_CACHE });
}
