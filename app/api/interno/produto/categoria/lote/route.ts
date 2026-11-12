import { definirCategoria, validarCategoria, chaveDoNome } from "../../../../../categoria-override";
import { definirControlado } from "../../../../../controlado-override";
import { dispararSincronizacao } from "../../../../../disparar-sync";
import { banco } from "../../../../../estoque-fonte";
import { sistemaReceitaOuControlado } from "../route";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const MAX_ITENS = 300;

/**
 * Move vários produtos para uma categoria de uma vez (mesmas regras do produto a produto: receita e controlado do sistema
 * não saem de Medicamentos) e dispara uma única publicação no fim. Só equipe logada.
 */
export async function POST(request: Request) {
  let c: { originais?: unknown; categoria?: unknown; por?: unknown } = {};
  try {
    c = (await request.json()) as typeof c;
  } catch {
    // corpo inválido
  }
  const por = typeof c.por === "string" ? c.por.replace(/\s+/g, " ").trim() : "";
  const quem = por.length >= 2 ? por : "painel";
  const v = validarCategoria(c.categoria);
  const lista = Array.isArray(c.originais) ? c.originais : [];
  const originais = [...new Map(lista.filter((x): x is string => typeof x === "string").map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x && x.length <= 200).map((x) => [chaveDoNome(x), x])).values()];
  if (!originais.length || lista.length > MAX_ITENS || quem.length > 60) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  if (!v.ok) return Response.json({ ok: false, erro: v.erro }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });

  const aplicados: string[] = [];
  const bloqueados: string[] = [];
  for (const original of originais) {
    if (v.estado !== "auto" && v.estado !== "Medicamentos" && sistemaReceitaOuControlado(original)) {
      bloqueados.push(original);
      continue;
    }
    await definirCategoria(db, original, v.estado, quem);
    if (v.estado !== "auto" && v.estado !== "Medicamentos") await definirControlado(db, original, "auto", quem);
    aplicados.push(original);
  }
  const publicando = aplicados.length ? await dispararSincronizacao(db) : false;
  return Response.json({ ok: true, categoria: v.estado, aplicados, bloqueados, publicando }, { headers: SEM_CACHE });
}
