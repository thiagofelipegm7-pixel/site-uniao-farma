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
 * Entram só os que já têm logo em /public/marcas.
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
  { slug: "uniao-quimica", nome: "União Química", busca: "uniao quim", href: emMedicamentos("uniao quim") },
];

/**
 * Marcas da faixa do departamento Dermocosméticos (contagem de produtos não esgotados: Farmax 12, Nivea 8, Dove 7, Cetaphil 3,
 * CeraVe, Neutrogena, Sundown, Cicatricure e Monange 2 cada). O clique filtra a lista do próprio departamento.
 */
const emDermocosmeticos = (termo: string) => `/departamentos/dermocosmeticos?q=${encodeURIComponent(termo)}`;
export const MARCAS_DERMOCOSMETICOS: readonly MarcaDestaque[] = [
  { slug: "farmax", nome: "Farmax", busca: "farmax", href: emDermocosmeticos("farmax") },
  { slug: "nivea", nome: "Nivea", busca: "nivea", href: emDermocosmeticos("nivea") },
  { slug: "dove", nome: "Dove", busca: "dove", href: emDermocosmeticos("dove") },
  { slug: "cetaphil", nome: "Cetaphil", busca: "cetaphil", href: emDermocosmeticos("cetaphil") },
  { slug: "cerave", nome: "CeraVe", busca: "cerave", href: emDermocosmeticos("cerave") },
  { slug: "neutrogena", nome: "Neutrogena", busca: "neutrog", cheia: true, href: emDermocosmeticos("neutrog") },
  { slug: "sundown", nome: "Sundown", busca: "sundown", href: emDermocosmeticos("sundown") },
  { slug: "cicatricure", nome: "Cicatricure", busca: "cicatricure", href: emDermocosmeticos("cicatricure") },
  { slug: "monange", nome: "Monange", busca: "monange", cheia: true, href: emDermocosmeticos("monange") },
];

/**
 * Marcas da faixa do departamento Infantil e Gestante (produtos não esgotados: Isababy 11, Granado 7, Johnson's 6, Babysec 6, Skalinha 6, Pampers 4).
 * O clique filtra a lista do próprio departamento.
 */
const emInfantil = (termo: string) => `/departamentos/infantil-e-gestante?q=${encodeURIComponent(termo)}`;
export const MARCAS_INFANTIL: readonly MarcaDestaque[] = [
  { slug: "isababy", nome: "Isababy", busca: "isabab", href: emInfantil("isabab") },
  { slug: "granado", nome: "Granado", busca: "granado", href: emInfantil("granado") },
  { slug: "johnsons", nome: "Johnson's", busca: "j&j", href: emInfantil("j&j") },
  { slug: "babysec", nome: "Babysec", busca: "babysec", href: emInfantil("babysec") },
  { slug: "pampers", nome: "Pampers", busca: "pampers", href: emInfantil("pampers") },
  { slug: "skalinha", nome: "Skalinha", busca: "skalinha", href: emInfantil("skalinha") },
  { slug: "kuka", nome: "Kuka", busca: "kuka", href: emInfantil("kuka") },
  { slug: "buba", nome: "Buba", busca: "buba", href: emInfantil("buba") },
  { slug: "cremer", nome: "Cremer", busca: "cremer", href: emInfantil("cremer") },
  { slug: "personal", nome: "Personal", busca: "personal", href: emInfantil("personal") },
  { slug: "dentil", nome: "Dentil", busca: "dentil", href: emInfantil("dentil") },
];

/**
 * Marcas da faixa do departamento Cuidado Diário (produtos não esgotados: Farmax 30, Missner 16, Cimed 12, Cremer 11, Granado 11, Colgate 10, Nivea 10, Gillette 9, Always 7, Intimus 5).
 * O clique filtra a lista do próprio departamento.
 */
const emCuidadoDiario = (termo: string) => `/departamentos/cuidado-diario?q=${encodeURIComponent(termo)}`;
export const MARCAS_CUIDADO_DIARIO: readonly MarcaDestaque[] = [
  { slug: "farmax", nome: "Farmax", busca: "farmax", href: emCuidadoDiario("farmax") },
  { slug: "missner", nome: "Missner", busca: "missner", href: emCuidadoDiario("missner") },
  { slug: "cimed", nome: "Cimed", busca: "cimed", href: emCuidadoDiario("cimed") },
  { slug: "cremer", nome: "Cremer", busca: "cremer", href: emCuidadoDiario("cremer") },
  { slug: "granado", nome: "Granado", busca: "granado", href: emCuidadoDiario("granado") },
  { slug: "colgate", nome: "Colgate", busca: "colgate", href: emCuidadoDiario("colgate") },
  { slug: "nivea", nome: "Nivea", busca: "nivea", href: emCuidadoDiario("nivea") },
  { slug: "gillette", nome: "Gillette", busca: "gillette", href: emCuidadoDiario("gillette") },
  { slug: "always", nome: "Always", busca: "always", href: emCuidadoDiario("always") },
  { slug: "intimus", nome: "Intimus", busca: "intimus", href: emCuidadoDiario("intimus") },
];

/**
 * Marcas da faixa do departamento Beleza (produtos não esgotados: Salon Line 32, Wella 24, Embelleze 24, L'Oréal 20, Seda 17, Bio Extratus 17).
 * Impala 26, Risqué 15, Alta Moda 15 e Niely 13 (esmaltes e tintas). O clique filtra a lista do próprio departamento.
 */
const emBeleza = (termo: string) => `/departamentos/beleza?q=${encodeURIComponent(termo)}`;
export const MARCAS_BELEZA: readonly MarcaDestaque[] = [
  { slug: "salon-line", nome: "Salon Line", busca: "salon line", cheia: true, href: emBeleza("salon line") },
  { slug: "wella", nome: "Wella", busca: "wella", cheia: true, href: emBeleza("wella") },
  { slug: "embelleze", nome: "Embelleze", busca: "embelleze", cheia: true, href: emBeleza("embelleze") },
  { slug: "loreal", nome: "L'Oréal", busca: "loreal", href: emBeleza("loreal") },
  { slug: "seda", nome: "Seda", busca: "seda", href: emBeleza("seda") },
  { slug: "bio-extratus", nome: "Bio Extratus", busca: "extrat", href: emBeleza("extrat") },
  { slug: "impala", nome: "Impala", busca: "impala", href: emBeleza("impala") },
  { slug: "alta-moda", nome: "Alta Moda", busca: "alta moda", href: emBeleza("alta moda") },
  { slug: "risque", nome: "Risqué", busca: "risque", href: emBeleza("risque") },
  { slug: "niely", nome: "Niely", busca: "niely", href: emBeleza("niely") },
];

/**
 * Faixa de cada departamento. Sem entrada aqui, a página usa a faixa geral (MARCAS_DESTAQUE). Lista vazia = a página não mostra faixa.
 * Perfumes está vazia: o departamento tem 3 produtos em estoque e as marcas gerais (Dove, Nivea…) não levam a nada ali.
 */
export const MARCAS_POR_DEPARTAMENTO: Readonly<Record<string, readonly MarcaDestaque[]>> = {
  medicamentos: MARCAS_MEDICAMENTOS,
  dermocosmeticos: MARCAS_DERMOCOSMETICOS,
  "infantil-e-gestante": MARCAS_INFANTIL,
  beleza: MARCAS_BELEZA,
  "cuidado-diario": MARCAS_CUIDADO_DIARIO,
  perfumes: [],
};
