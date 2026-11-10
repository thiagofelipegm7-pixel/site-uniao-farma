/**
 * Marcas da faixa "Navegue por marcas" da home: as de maior volume com estoque na loja Nações Unidas
 * (contagem por nome do produto e fabricante, produtos não esgotados). `busca` é o termo enviado à busca do catálogo.
 * O logo vem de /public/marcas/<slug>.(png|svg|webp|jpg); sem o arquivo, a faixa mostra o nome em texto.
 */
export type MarcaDestaque = { slug: string; nome: string; busca: string; /** Logo que é uma arte colorida: ocupa o quadrado inteiro, sem margem. */ cheia?: boolean; /** Destino do clique. Sem ele, abre a busca geral de produtos pela `busca`. */ href?: string };

export const MARCAS_DESTAQUE: readonly MarcaDestaque[] = [
  { slug: "dove", nome: "Dove", busca: "dove" },
  { slug: "nivea", nome: "Nivea", busca: "nivea" },
  { slug: "rexona", nome: "Rexona", busca: "rexona" },
  { slug: "seda", nome: "Seda", busca: "seda" },
  { slug: "pantene", nome: "Pantene", busca: "pantene" },
  { slug: "loreal", nome: "L'Oréal", busca: "loreal" },
  { slug: "wella", nome: "Wella", busca: "wella", cheia: true },
  { slug: "embelleze", nome: "Embelleze", busca: "embelleze", cheia: true },
  { slug: "salon-line", nome: "Salon Line", busca: "salon line", cheia: true },
  { slug: "granado", nome: "Granado", busca: "granado" },
  { slug: "skala", nome: "Skala", busca: "skala" },
  { slug: "monange", nome: "Monange", busca: "monange", cheia: true },
  { slug: "colgate", nome: "Colgate", busca: "colgate" },
  { slug: "bio-extratus", nome: "Bio Extratus", busca: "extratus" },
  { slug: "cimed", nome: "Cimed", busca: "cimed" },
  { slug: "farmax", nome: "Farmax", busca: "farmax" },
];

export const EXTENSOES_LOGO = ["png", "svg", "webp", "jpg"] as const;

/**
 * Laboratórios da faixa do departamento Medicamentos, em ordem de volume de estoque (contagem de produtos não esgotados).
 * Entram só os que já têm logo em /public/marcas; a União Química entra quando o logo chegar.
 * O clique abre a lista de Medicamentos já filtrada pelo laboratório.
 */
const emMedicamentos = (termo: string) => `/departamentos/medicamentos?q=${encodeURIComponent(termo)}`;
export const MARCAS_MEDICAMENTOS: readonly MarcaDestaque[] = [
  { slug: "cimed", nome: "Cimed", busca: "cimed", href: emMedicamentos("cimed") },
  { slug: "ache", nome: "Achê", busca: "ache", href: emMedicamentos("ache") },
  { slug: "ems", nome: "EMS", busca: "ems", href: emMedicamentos("ems") },
  { slug: "neo-quimica", nome: "Neo Química", busca: "neo quimic", href: emMedicamentos("neo quimic") },
  { slug: "natulab", nome: "Natulab", busca: "natulab", href: emMedicamentos("natulab") },
  { slug: "cosmed", nome: "Cosmed", busca: "cosmed", href: emMedicamentos("cosmed") },
  { slug: "eurofarma", nome: "Eurofarma", busca: "eurofarma", cheia: true, href: emMedicamentos("eurofarma") },
  { slug: "teuto", nome: "Teuto", busca: "teuto", href: emMedicamentos("teuto") },
  { slug: "geolab", nome: "Geolab", busca: "geolab", cheia: true, href: emMedicamentos("geolab") },
  { slug: "medley", nome: "Medley", busca: "medley", href: emMedicamentos("medley") },
  { slug: "bayer", nome: "Bayer", busca: "bayer", href: emMedicamentos("bayer") },
];
