import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";

function clienteId(request: Request): string {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/uf_cid=([^;]+)/);
  if (match) return match[1];
  return "anon_" + Math.random().toString(36).slice(2, 10);
}

export async function GET(request: Request) {
  const db = banco();
  if (!db) return Response.json({ ok: false, itens: [] });

  const cid = clienteId(request);
  try {
    const rows = await db.prepare(
      "SELECT id, itens, total, criado_em FROM pedidos WHERE cliente_id = ? ORDER BY id DESC LIMIT 20"
    ).bind(cid).all();
    return Response.json({ ok: true, itens: rows.results || [] });
  } catch {
    return Response.json({ ok: true, itens: [] });
  }
}

export async function POST(request: Request) {
  const db = banco();
  if (!db) return Response.json({ ok: false }, { status: 501 });

  let corpo: { itens?: unknown; total?: string } = {};
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const itens = JSON.stringify(corpo.itens || []).slice(0, 4000);
  const total = (corpo.total || "").slice(0, 20);
  const cid = clienteId(request);

  try {
    await db.prepare(
      "INSERT INTO pedidos (cliente_id, itens, total, criado_em) VALUES (?, ?, ?, ?)"
    ).bind(cid, itens, total, new Date().toISOString()).run();
  } catch {}

  return Response.json({ ok: true }, {
    headers: { "set-cookie": `uf_cid=${cid}; Path=/; Max-Age=31536000; SameSite=Lax` },
  });
}
