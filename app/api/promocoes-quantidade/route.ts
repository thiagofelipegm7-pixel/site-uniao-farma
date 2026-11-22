import { listarPromocoesQuantidade } from "../../promocao-quantidade";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ promocoes: await listarPromocoesQuantidade() }, { headers: { "cache-control": "public, max-age=60" } });
  } catch {
    return Response.json({ promocoes: [] }, { headers: { "cache-control": "no-store" } });
  }
}
