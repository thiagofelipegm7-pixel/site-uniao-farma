import { listarTodasApresentacoes, lerFotoApresentacao } from "../../apresentacoes-produto";
import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

export async function GET(request: Request) {
  const db = banco();
  if (!db) return Response.json({ apresentacoes: [] }, { headers: SEM_CACHE });
  const url = new URL(request.url);
  const ean = url.searchParams.get("ean") ?? "";
  const ordem = Number(url.searchParams.get("ordem") ?? 0);
  if (url.searchParams.get("imagem") === "1") {
    if (!/^\d{8,14}$/.test(ean) || !Number.isInteger(ordem) || ordem < 1 || ordem > 6) return new Response(null, { status: 400, headers: SEM_CACHE });
    const foto = await lerFotoApresentacao(db, ean, ordem);
    if (!foto) return new Response(null, { status: 404, headers: SEM_CACHE });
    const bytes = Uint8Array.from(atob(foto.base64), (c) => c.charCodeAt(0));
    return new Response(bytes, { headers: { "content-type": foto.mime, ...SEM_CACHE } });
  }
  return Response.json({ apresentacoes: await listarTodasApresentacoes(db) }, { headers: SEM_CACHE });
}
