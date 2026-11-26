import { banco } from "../../estoque-fonte";
import type { Banco } from "../../nomes-corrigidos";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 512) {
    return Response.json({ ok: false }, { status: 413 });
  }

  let corpo: { produto?: string; email?: string } = {};
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const produto = (corpo.produto || "").trim().slice(0, 120);
  const email = (corpo.email || "").trim().toLowerCase().slice(0, 120);

  if (!produto || !email.includes("@")) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const db = banco() as unknown as Banco | null;
  if (db) {
    try {
      await db.prepare(
        "INSERT INTO avise_me (produto, email, criado_em) VALUES (?, ?, ?)"
      ).bind(produto, email, new Date().toISOString()).run();
    } catch {
      // Tabela pode não existir ainda
    }
  }

  return Response.json({ ok: true });
}
