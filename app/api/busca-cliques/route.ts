import { cliquesPorTermo, registrarClique, slugParaRegistro, termoParaRegistro } from "../../busca-cliques";
import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";

const porMinuto = new Map<string, { n: number; ate: number }>();
const diaBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Mapa anônimo "busca → produtos mais abertos" para a lista Recomendados. Vazio (e nunca erro) quando não há dados. */
export async function GET() {
  const db = banco();
  const mapa = db ? await cliquesPorTermo(db, diaBrasilia()).catch(() => ({})) : {};
  return Response.json(mapa, { headers: { "cache-control": "public, max-age=600, s-maxage=600" } });
}

/** Recebe "a pessoa buscou X e abriu o produto Y". Anônimo (o IP só conta o limite na memória, não é guardado). Nunca devolve erro. */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 512) return new Response(null, { status: 413 });
  const origem = request.headers.get("origin");
  if (origem) {
    try {
      if (new URL(origem).host !== new URL(request.url).host) return new Response(null, { status: 204 });
    } catch {
      return new Response(null, { status: 204 });
    }
  }
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const agora = Date.now();
  const atual = porMinuto.get(ip);
  if (atual && atual.ate > agora && atual.n >= 20) return new Response(null, { status: 204 });
  porMinuto.set(ip, atual && atual.ate > agora ? { n: atual.n + 1, ate: atual.ate } : { n: 1, ate: agora + 60_000 });
  if (porMinuto.size > 2000) porMinuto.clear();
  let corpo: { q?: unknown; s?: unknown } = {};
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return new Response(null, { status: 400 });
  }
  const termo = termoParaRegistro(corpo.q);
  const slug = slugParaRegistro(corpo.s);
  const db = banco();
  if (termo && slug && db) await registrarClique(db, termo, slug, diaBrasilia()).catch(() => undefined);
  return new Response(null, { status: 204 });
}
