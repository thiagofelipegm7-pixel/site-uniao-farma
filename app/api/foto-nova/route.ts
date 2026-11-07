import { banco } from "../../estoque-fonte";
import { lerFoto } from "../../fotos-enviadas";

export const dynamic = "force-dynamic";

/** A foto enviada pelo painel, antes de virar arquivo do site. */
export async function GET(request: Request) {
  const ean = new URL(request.url).searchParams.get("ean") ?? "";
  const db = banco();
  if (!db || !/^\d{8,14}$/.test(ean)) return new Response("não encontrada", { status: 404 });
  const foto = await lerFoto(db, ean).catch(() => null);
  if (!foto) return new Response("não encontrada", { status: 404, headers: { "cache-control": "no-store" } });
  return new Response(Uint8Array.from(atob(foto.base64), (c) => c.charCodeAt(0)), { headers: { "content-type": foto.mime, "cache-control": "public, max-age=60" } });
}
