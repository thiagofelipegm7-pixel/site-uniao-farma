import { mapaDeCategorias } from "../../../../categoria-override";
import { chaveDoNome, definirControlado, ehCategoriaComControlado, validarEstado } from "../../../../controlado-override";
import { dispararSincronizacao } from "../../../../disparar-sync";
import { banco } from "../../../../estoque-fonte";
import { carregarCatalogoCompleto } from "../../../../nacoes-unidas/produtos/catalogo";
import { carregarRestritos } from "../../../../nacoes-unidas/produtos/receita";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Categoria pública do produto (mesma regra do painel Corrigir produto). Restritos contam como Medicamentos. */
export function categoriaDoProduto(original: string): string {
  const chave = chaveDoNome(original);
  for (const i of carregarCatalogoCompleto().itens) {
    if (chaveDoNome(i.nome) === chave) return i.categoria;
  }
  const r = carregarRestritos();
  for (const i of [...r.receita, ...r.controlados, ...(r.consulte ?? [])]) {
    if (chaveDoNome(i.nome) === chave) return "Medicamentos";
  }
  return "";
}

/** Define o override Controlado (Portaria 344): automático / sim / não. Só equipe logada. Só Medicamentos podem receber sim/não. */
export async function POST(request: Request) {
  let c: { original?: unknown; estado?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const original = typeof c.original === "string" ? c.original.replace(/\s+/g, " ").trim() : "";
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 ? por : "painel";
  const v = validarEstado(c.estado);
  if (!original || original.length > 200 || quem.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  // Limpar (auto) sempre pode; marcar sim/não só com categoria efetiva Medicamentos (override conta).
  if (v.estado !== "auto") {
    const ovr = db ? await mapaDeCategorias(db).catch(() => ({})) : {};
    const efetiva = ovr[chaveDoNome(original)]?.categoria ?? categoriaDoProduto(original);
    if (!ehCategoriaComControlado(efetiva)) {
      return Response.json({ ok: false, erro: "so_medicamentos" }, { status: 400, headers: SEM_CACHE });
    }
  }
  await definirControlado(db, original, v.estado, quem);
  const publicando = await dispararSincronizacao(db);
  return Response.json({ ok: true, estado: v.estado, publicando }, { headers: SEM_CACHE });
}
