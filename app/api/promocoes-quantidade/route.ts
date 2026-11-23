import { listarPromocoesQuantidade } from "../../promocao-quantidade";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

export async function GET() {
  try {
    return Response.json({ promocoes: await listarPromocoesQuantidade() }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ promocoes: [] }, { status: 503, headers: SEM_CACHE });
  }
}
