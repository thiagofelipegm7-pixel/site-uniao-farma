import { definirCategoria, validarCategoria, chaveDoNome } from "../../../../categoria-override";
import { definirControlado } from "../../../../controlado-override";
import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { carregarRestritos } from "../../../../nacoes-unidas/produtos/receita";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Item que o sistema enquadra como receita ou controlado (Portaria 344) — não pode sair de Medicamentos. Consulte pode. */
export function sistemaReceitaOuControlado(original: string): boolean {
  const chave = chaveDoNome(original);
  const r = carregarRestritos();
  for (const i of [...r.receita, ...r.controlados]) {
    if (chaveDoNome(i.nome) === chave) return true;
  }
  return false;
}

/** Define override de categoria (ou automático). Só equipe logada. */
export async function POST(request: Request) {
  let c: { original?: unknown; categoria?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 ? por : "painel";
  const v = validarCategoria(c.categoria);
  if (!original || original.length > 200 || quem.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: 400, headers: SEM_CACHE });

  // Sair de Medicamentos com item de receita/controlado do sistema: bloqueado.
  if (v.estado !== "auto" && v.estado !== "Medicamentos" && sistemaReceitaOuControlado(original)) {
    return Response.json({ ok: false, erro: "sistema_restrito" }, { status: 400, headers: SEM_CACHE });
  }

  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  await definirCategoria(db, original, v.estado, quem);
  // Ao tirar de Medicamentos (ou voltar ao automático que não seja Medicamentos no sync), limpa override de controlado.
  if (v.estado !== "auto" && v.estado !== "Medicamentos") {
    await definirControlado(db, original, "auto", quem);
  }
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, categoria: v.estado, publicando }, { headers: SEM_CACHE });
}
