import { xmlDoFeed } from "../../nacoes-unidas/produtos/google-shopping-feed";

/** Feed do Google Merchant Center (listagens gratuitas). Público, sem medicamentos; gerado do catálogo publicado. */
export async function GET() {
  return new Response(xmlDoFeed(), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-robots-tag": "noindex",
    },
  });
}
