/**
 * Marcas da faixa "Navegue por marcas" da home: as de maior volume com estoque na loja Nações Unidas
 * (contagem por nome do produto e fabricante, produtos não esgotados). `busca` é o termo enviado à busca do catálogo.
 * O logo vem de /public/marcas/<slug>.(png|svg|webp|jpg); sem o arquivo, a faixa mostra o nome em texto.
 */
export type MarcaDestaque = { slug: string; nome: string; busca: string };

export const MARCAS_DESTAQUE: readonly MarcaDestaque[] = [
  { slug: "dove", nome: "Dove", busca: "dove" },
  { slug: "nivea", nome: "Nivea", busca: "nivea" },
  { slug: "rexona", nome: "Rexona", busca: "rexona" },
  { slug: "seda", nome: "Seda", busca: "seda" },
  { slug: "pantene", nome: "Pantene", busca: "pantene" },
  { slug: "loreal", nome: "L'Oréal", busca: "loreal" },
  { slug: "wella", nome: "Wella", busca: "wella" },
  { slug: "embelleze", nome: "Embelleze", busca: "embelleze" },
  { slug: "salon-line", nome: "Salon Line", busca: "salon line" },
  { slug: "granado", nome: "Granado", busca: "granado" },
  { slug: "skala", nome: "Skala", busca: "skala" },
  { slug: "monange", nome: "Monange", busca: "monange" },
  { slug: "colgate", nome: "Colgate", busca: "colgate" },
  { slug: "bio-extratus", nome: "Bio Extratus", busca: "extratus" },
  { slug: "cimed", nome: "Cimed", busca: "cimed" },
  { slug: "farmax", nome: "Farmax", busca: "farmax" },
];

export const EXTENSOES_LOGO = ["png", "svg", "webp", "jpg"] as const;
