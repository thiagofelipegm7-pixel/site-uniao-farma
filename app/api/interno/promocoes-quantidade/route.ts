import { banco } from "../../../estoque-fonte";
import { listarPromocoesQuantidade, salvarPromocoesQuantidade } from "../../../promocao-quantidade";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

export async function GET() {
  try {
    return Response.json({ promocoes: await listarPromocoesQuantidade() }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ promocoes: [], erro: "Não consegui carregar as promoções." }, { status: 503, headers: SEM_CACHE });
  }
}

export async function POST(request: Request) {
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503, headers: SEM_CACHE });
  const corpo = await request.json().catch(() => ({})) as { promocoes?: unknown };
  try {
    const resultado = await salvarPromocoesQuantidade(corpo.promocoes);
    return Response.json(resultado, { status: resultado.ok ? 200 : 400, headers: SEM_CACHE });
  } catch {
    return Response.json({ ok: false, erro: "Não consegui salvar as promoções." }, { status: 500, headers: SEM_CACHE });
  }
}
