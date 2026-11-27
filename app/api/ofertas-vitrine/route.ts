import { ofertasDaHome } from "../../shop/destaques-servidor";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ itens: ofertasDaHome() }, { headers: { "cache-control": "public, max-age=300" } });
}
