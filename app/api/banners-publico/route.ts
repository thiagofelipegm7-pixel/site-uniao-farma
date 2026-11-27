import { bannersPublicos } from "../../shop/destaques-servidor";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "public, max-age=60" };

// Arte de cada vaga + destino (o mais recente de cada vaga): termo de busca e/ou slug do produto no índice.
export async function GET() {
  return Response.json({ banners: await bannersPublicos() }, { headers: SEM_CACHE });
}
