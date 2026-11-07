import { banco, segredo } from "../../estoque-fonte";
import { apagarFoto, lerFoto, listarPendentes, listarRemocoes } from "../../fotos-enviadas";

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

/** Lida só pela sincronização automática (mesmo token do catálogo): lista as fotos enviadas pelo painel, ou devolve uma (?ean=). */
export async function GET(request: Request) {
  if (!autorizado(request)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const ean = new URL(request.url).searchParams.get("ean");
  if (!ean) return Response.json({ ok: true, fotos: await listarPendentes(db), remover: await listarRemocoes(db) }, { headers: SEM_CACHE });
  if (!/^\d{8,14}$/.test(ean)) return Response.json({ ok: false, erro: "codigo_invalido" }, { status: 400, headers: SEM_CACHE });
  const foto = await lerFoto(db, ean);
  if (!foto) return Response.json({ ok: false, erro: "nao_encontrada" }, { status: 404, headers: SEM_CACHE });
  return new Response(Uint8Array.from(atob(foto.base64), (c) => c.charCodeAt(0)), { headers: { ...SEM_CACHE, "content-type": foto.mime } });
}

/** Depois que a foto foi publicada no site, a sincronização apaga a cópia daqui. */
export async function DELETE(request: Request) {
  if (!autorizado(request)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  const ean = new URL(request.url).searchParams.get("ean") ?? "";
  if (!db || !/^\d{8,14}$/.test(ean)) return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  await apagarFoto(db, ean);
  return Response.json({ ok: true }, { headers: SEM_CACHE });
}
