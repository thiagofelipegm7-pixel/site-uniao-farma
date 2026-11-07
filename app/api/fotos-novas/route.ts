import { banco } from "../../estoque-fonte";
import { listarNovas, listarRemocoes } from "../../fotos-enviadas";

export const dynamic = "force-dynamic";

/** Fotos enviadas pelo painel e ainda não publicadas: o site as mostra na hora (a publicação fixa o arquivo depois). Público: só página do produto e código. */
export async function GET() {
  const db = banco();
  const novas = db ? await listarNovas(db).catch(() => ({})) : {};
  const removidas = db ? (await listarRemocoes(db).catch(() => [])).flatMap((r) => (r.slug ? [r.slug] : [])) : [];
  return Response.json({ novas, removidas }, { headers: { "cache-control": "public, max-age=20" } });
}
