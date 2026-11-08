import { banco, segredo } from "../../estoque-fonte";
import { mapaDeAprovacoes } from "../../revisao";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Lida só pela sincronização (mesmo token do catálogo): as aprovações feitas no painel de revisão. */
export async function GET(request: Request) {
  const token = segredo("CATALOGO_READ_TOKEN");
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !enviado || !iguais(token, enviado)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: true, aprovacoes: {} }, { headers: SEM_CACHE });
  return Response.json({ ok: true, aprovacoes: await mapaDeAprovacoes(db) }, { headers: SEM_CACHE });
}
