import { segredo } from "../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "public, max-age=60" };
const REPO = "thiagofelipegm7-pixel/site-uniao-farma";
const PATH = "app/nacoes-unidas/produtos/dados/banners.json";

type Banner = { id: string; url: string };

export async function GET() {
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return Response.json({ banners: [] }, { headers: SEM_CACHE });
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github.v3.raw" },
    });
    if (!r.ok) return Response.json({ banners: [] }, { headers: SEM_CACHE });
    const banners = (await r.json()) as Banner[];
    return Response.json({ banners }, { headers: SEM_CACHE });
  } catch {
    return Response.json({ banners: [] }, { headers: SEM_CACHE });
  }
}
