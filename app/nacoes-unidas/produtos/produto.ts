/**
 * Página de produto do catálogo da Nações.
 * Não há texto de saúde por item: "Para que serve" e "Destaques do rótulo" só aparecem se alguém preencher o dado.
 */

export type TextosProduto = {
  descricao?: string | null;
  paraQueServe?: string | null;
  destaques?: string | null;
};

export type FaqProduto = { q: string; a: string };

/**
 * Chupetas, bicos, mamadeiras e seus prendedores: a Lei 11.265/2006 (NBCAL) permite oferecer o produto, mas a divulgação
 * precisa trazer o aviso do Ministério da Saúde (texto igual ao das embalagens) e esses itens não entram em vitrines
 * nem em destaques da home.
 */
export const AVISO_NBCAL =
  "O Ministério da Saúde adverte: a criança que mama no peito não necessita de mamadeira, bico ou chupeta. O uso de mamadeira, bico ou chupeta prejudica o aleitamento materno.";

export function ehNbcal(nome: string): boolean {
  const n = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (/\bSERINGA\b/.test(n)) return false; // "bico luer" é conector de seringa, não bico de mamadeira
  return /\b(CHUPETA|MAMADEIRA|CHUQUINHA)\b|^BICO\b|\bBICO (MAMAD|CHUPETA|PEPETA|MAMITA)|PRENDEDOR DE (BICO|CHUPETA)|PREDNDEDOR DE (BICO|CHUPETA)/.test(n);
}

export const AVISO_MIP = "Medicamento isento de prescrição. Se persistirem os sintomas, o médico deverá ser consultado.";

export const NOTA_PRECO = "A loja confirma preço e estoque pelo WhatsApp.";

/** Itens que não são medicamento (ver ehMedicamentoOuDuvida): o preço do site vale como preço firme. */
export const NOTA_PRECO_FIRME = "O preço do site vale para o seu pedido. Pelo WhatsApp, a loja só confirma o estoque e combina a entrega.";

export const FAQ_PRODUTO: readonly FaqProduto[] = [
  {
    q: "Preciso pagar agora?",
    a: "Não. A cesta não cobra nada no site. O pagamento é no balcão ou na entrega.",
  },
  {
    q: "Posso retirar ou receber em casa?",
    a: "Pode retirar na loja Nações Unidas. Para receber em casa, a loja combina taxa e prazo pelo WhatsApp.",
  },
];

function limparTexto(valor: string | null | undefined): string | null {
  const texto = valor?.replace(/\s+/g, " ").trim();
  return texto ? texto : null;
}

/** Sem texto preenchido, a seção não existe. Não inventar benefício. */
export function textosPublicaveis(textos?: TextosProduto | null): { descricao: string | null; paraQueServe: string | null; destaques: string | null } {
  return {
    descricao: limparTexto(textos?.descricao),
    paraQueServe: limparTexto(textos?.paraQueServe),
    destaques: limparTexto(textos?.destaques),
  };
}

const UNIDADE: Record<string, string> = {
  ml: "ml",
  l: "l",
  litro: "l",
  litros: "l",
  mg: "mg",
  g: "g",
  gr: "g",
  kg: "kg",
  cap: "cápsula",
  caps: "cápsulas",
  mts: "m",
  mt: "m",
  m: "m",
  un: "un",
  und: "un",
  unid: "un",
};

/** Última medida do nome (200 ml, 56 g, 60 cápsulas). Sem unidade, null. */
export function conteudoDoNome(nome: string): string | null {
  const re = /(\d+(?:[.,]\d+)?)\s*(ml|mg|kg|gr|g|litros|litro|l|caps|cap|mts|mt|unid|und|un)\b/gi;
  const achados = [...nome.matchAll(re)];
  const ultimo = achados.at(-1);
  if (!ultimo) return null;
  const bruto = ultimo[1].replace(".", ",");
  const chave = ultimo[2].toLowerCase();
  let unidade = UNIDADE[chave] ?? chave;
  const quantidade = Number(ultimo[1].replace(",", "."));
  if (chave === "cap" && quantidade !== 1) unidade = "cápsulas";
  if (chave === "caps" && quantidade === 1) unidade = "cápsula";
  return `${bruto} ${unidade}`;
}

export function descricaoMetadata(nome: string, descricao?: string | null, precoFirme = false): string {
  const texto = descricao?.replace(/\s+/g, " ").trim();
  if (texto) return `${texto} União Farma Nações Unidas, Sabará.`;
  return `${nome} na União Farma Nações Unidas, Sabará. ${precoFirme ? NOTA_PRECO_FIRME : NOTA_PRECO}`;
}

/** Oferta do JSON-LD: só para itens de elegivelGoogle (não medicamento, em estoque, com foto), com o preço do site. */
export type OfertaProduto = { preco: number; gtin?: string | null };

/**
 * Product sem nota e sem avaliação. Medicamento e item fora do Google ficam sem oferta (o preço fica só na página).
 * Com `oferta` (item elegível ao Google): Offer com preço em BRL, InStock, condição nova e a página do produto.
 */
export function jsonLdProduto(input: { nome: string; lab: string; categoria: string; url: string; image?: string | null; descricao?: string | null; oferta?: OfertaProduto | null }): Record<string, unknown> {
  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.nome,
    category: input.categoria,
    url: input.url,
    description: descricaoMetadata(input.nome, input.descricao, Boolean(input.oferta)),
  };
  const marca = input.lab.trim();
  if (marca) dados.brand = { "@type": "Brand", name: marca };
  if (input.image) dados.image = input.image;
  const oferta = input.oferta;
  if (oferta && Number.isFinite(oferta.preco) && oferta.preco > 0) {
    if (oferta.gtin) dados.gtin = oferta.gtin;
    dados.offers = {
      "@type": "Offer",
      price: oferta.preco.toFixed(2),
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: input.url,
      seller: { "@type": "Organization", name: "União Farma Nações Unidas" },
    };
  }
  return dados;
}
