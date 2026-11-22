import { banco, segredo } from "../../estoque-fonte";
import { listarTodasColecoes, lerFotoColecao } from "../../colecoes-fotos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function autorizado(request: Request) {
  const token = segredo("CATALOGO_READ_TOKEN");
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return Boolean(token && enviado && iguais(token, enviado));
}

/**
 * Lido só pela sincronização automática (mesmo token do catálogo). Sem ?ean: lista as coleções
 * ({ colecoes: { EAN: [ordem, ...] } }). Com ?ean&ordem: devolve a foto.
 * A equipe mantém as coleções no D1 o tempo todo; a sincronização recria as pastas a partir desta lista.
 */
export async function GET(request: Request) {
  if (!autorizado(request)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const url = new URL(request.url);
  const ean = url.searchParams.get("ean");
  const ordem = Number(url.searchParams.get("ordem") ?? 0);
  if (ean) {
    if (!/^\d{8,14}$/.test(ean) || !(ordem > 0)) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
    const foto = await lerFotoColecao(db, ean, ordem);
    if (!foto) return Response.json({ ok: false, erro: "nao_encontrada" }, { status: 404, headers: SEM_CACHE });
    return new Response(Uint8Array.from(atob(foto.base64), (c) => c.charCodeAt(0)), { headers: { ...SEM_CACHE, "content-type": foto.mime } });
  }
  const todas = await listarTodasColecoes(db);
  const colecoes: Record<string, number[]> = {};
  for (const linha of todas) (colecoes[linha.ean] ??= []).push(linha.ordem);
  return Response.json({ ok: true, colecoes }, { headers: SEM_CACHE });
}
