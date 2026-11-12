import { definirDescricao, validarDescricao, chaveDoNome } from "../../../../descricao-override";
import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { carregarCatalogoCompleto } from "../../../../nacoes-unidas/produtos/catalogo";
import { ehNbcal } from "../../../../nacoes-unidas/produtos/produto";
import { carregarRestritos } from "../../../../nacoes-unidas/produtos/receita";
import { ehFormulaInfantil } from "../../../../nacoes-unidas/produtos/relacionados";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Medicamento (com ou sem receita), NBCAL e fórmula infantil não têm descrição escrita à mão: dependem de decisão do responsável técnico. */
function descricaoNaoPermitida(original: string): boolean {
  const chave = chaveDoNome(original);
  if (ehNbcal(original) || ehFormulaInfantil(original)) return true;
  const item = carregarCatalogoCompleto().itens.find((i) => chaveDoNome(i.nome) === chave);
  if (item && (item.isMIP || item.categoria === "Medicamentos")) return true;
  const r = carregarRestritos();
  return [...r.receita, ...r.controlados, ...r.consulte].some((i) => chaveDoNome(i.nome) === chave);
}

/** Escreve (ou volta ao automático) a descrição que o cliente lê na página do produto. Registra quem e o texto anterior. Só equipe logada. */
export async function POST(request: Request) {
  let c: { original?: unknown; texto?: unknown; fonte?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 ? por : "painel";
  const v = validarDescricao(c.texto, c.fonte);
  if (!original || original.length > 200 || quem.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: 400, headers: SEM_CACHE });
  if (v.texto !== null && descricaoNaoPermitida(original)) return Response.json({ ok: false, erro: "restrito" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  await definirDescricao(db, original, v.texto, v.fonte, quem);
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, publicando }, { headers: SEM_CACHE });
}
