import { listarCestasEsquecidas, marcarCesta } from "../../../cesta-esquecida";
import { banco } from "../../../estoque-fonte";
import type { Banco } from "../../../nomes-corrigidos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Lista de cestas esquecidas. Só equipe logada: o middleware protege todo /api/interno/. */
export async function GET() {
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  try {
    return Response.json({ ok: true, ...(await listarCestasEsquecidas(db, Date.now())) }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha_ao_ler" }, { status: 503, headers: SEM_CACHE });
  }
}

/** Marca o aviso como enviado (o operador mandou pelo WhatsApp) ou descarta a cesta. */
export async function PATCH(request: Request) {
  const corpo = (await request.json().catch(() => null)) as { id?: unknown; acao?: unknown } | null;
  const id = typeof corpo?.id === "string" ? corpo.id.trim() : "";
  const acao = corpo?.acao === "enviado" ? "enviada" : corpo?.acao === "descartar" ? "descartada" : null;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !acao) {
    return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const db = banco() as Banco | null;
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
  const ok = await marcarCesta(db, id, acao, new Date());
  if (!ok) return Response.json({ ok: false, erro: "nao_encontrado" }, { status: 404, headers: SEM_CACHE });
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
