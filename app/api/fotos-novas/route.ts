import { banco } from "../../estoque-fonte";
import { listarNovas } from "../../fotos-enviadas";

export const dynamic = "force-dynamic";

/** Fotos enviadas pelo painel e ainda não publicadas: o site as mostra na hora (a publicação fixa o arquivo depois). Público: só página do produto e código. */
export async function GET() {
  const db = banco();
  const mapa = db ? await listarNovas(db).catch(() => ({})) : {};
  return Response.json(mapa, { headers: { "cache-control": "public, max-age=20" } });
}
