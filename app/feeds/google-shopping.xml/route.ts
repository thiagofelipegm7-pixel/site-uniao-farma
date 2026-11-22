import { xmlDoFeedEmCache } from "../../nacoes-unidas/produtos/google-shopping-feed";

/** Feed do Google Merchant Center (listagens gratuitas). Público, sem medicamentos; gerado do catálogo publicado. */
export async function GET() {
  return new Response(xmlDoFeedEmCache(), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "x-robots-tag": "noindex",
    },
  });
}
