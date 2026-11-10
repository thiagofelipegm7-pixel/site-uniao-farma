import { banco } from "../../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

export async function POST(request: Request) {
  let c: { ean?: unknown; senha?: unknown } = {};
  try { c = (await request.json()) as typeof c; } catch {}
  const ean = typeof c.ean === "string" ? c.ean.trim() : "";
  const senha = typeof c.senha === "string" ? c.senha : "";
  if (senha !== "uniao") return Response.json({ ok: false, erro: "senha_incorreta" }, { status: 401, headers: SEM_CACHE });
  if (!ean) return Response.json({ ok: false, erro: "ean_invalido" }, { status: 400, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  try {
    await db.execute({ sql: "DELETE FROM estoque WHERE ean = ?", args: [ean] });
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "falha" }, { status: 500, headers: SEM_CACHE });
  }
}
