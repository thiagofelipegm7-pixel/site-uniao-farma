import { segredo } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const REPO = "thiagofelipegm7-pixel/site-uniao-farma";
const PATH = "app/nacoes-unidas/produtos/dados/banners.json";

type Banner = { id: string; url: string };

async function lerBanners(): Promise<{ banners: Banner[]; erro?: string }> {
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return { banners: [], erro: "sem_token" };
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github.v3.raw" },
    });
    if (!r.ok) return { banners: [], erro: `github_${r.status}` };
    return { banners: (await r.json()) as Banner[] };
  } catch (e) { return { banners: [], erro: String(e) }; }
}

export async function GET() {
  const result = await lerBanners();
  return Response.json(result, { headers: SEM_CACHE });
}

export async function POST(req: Request) {
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return Response.json({ ok: false, erro: "sem_token" }, { status: 503, headers: SEM_CACHE });
  const body = (await req.json().catch(() => ({}))) as { id?: string; url?: string };
  if (!body.id || !body.url) return Response.json({ ok: false, erro: "faltando" }, { status: 400, headers: SEM_CACHE });
  try {
    const meta = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!meta.ok) return Response.json({ ok: false, erro: `meta_${meta.status}` }, { status: 500, headers: SEM_CACHE });
    const sha = ((await meta.json()) as { sha: string }).sha;
    const atual = await lerBanners();
    const banners = atual.banners;
    const idx = banners.findIndex((b) => b.id === body.id);
    if (idx >= 0) banners[idx] = { id: body.id, url: body.url };
    else banners.push({ id: body.id, url: body.url });
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ message: "Atualiza banners", content: btoa(JSON.stringify(banners)), sha, branch: "main" }),
    });
    if (!r.ok) return Response.json({ ok: false, erro: `put_${r.status}` }, { status: 500, headers: SEM_CACHE });
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  } catch (e) {
    return Response.json({ ok: false, erro: String(e) }, { status: 500, headers: SEM_CACHE });
  }
}
