import { segredo } from "../../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const REPO = "thiagofelipegm7-pixel/site-uniao-farma";
const PATH = "app/nacoes-unidas/produtos/dados/banners.json";

type Banner = { id: string; url: string };

async function lerBanners(): Promise<Banner[]> {
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return [];
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github.v3.raw" },
    });
    if (!r.ok) return [];
    return (await r.json()) as Banner[];
  } catch { return []; }
}

async function salvarBanners(banners: Banner[]): Promise<boolean> {
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return false;
  try {
    const meta = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const sha = meta.ok ? ((await meta.json()) as { sha: string }).sha : undefined;
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${PATH}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: "Atualiza banners",
        content: btoa(JSON.stringify(banners)),
        sha,
        branch: "main",
      }),
    });
    return r.ok;
  } catch { return false; }
}

export async function GET() {
  const banners = await lerBanners();
  return Response.json({ banners }, { headers: SEM_CACHE });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; url?: string };
  if (!body.id || !body.url) return Response.json({ ok: false, erro: "faltando" }, { status: 400, headers: SEM_CACHE });
  const banners = await lerBanners();
  const idx = banners.findIndex((b) => b.id === body.id);
  if (idx >= 0) banners[idx] = { id: body.id, url: body.url };
  else banners.push({ id: body.id, url: body.url });
  const ok = await salvarBanners(banners);
  return Response.json({ ok }, { status: ok ? 200 : 500, headers: SEM_CACHE });
}
