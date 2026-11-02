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

export const AVISO_MIP = "Medicamento isento de prescrição. Leia a bula. Se persistirem os sintomas, o médico deverá ser consultado.";

export const NOTA_PRECO = "Preço do sistema da loja. A loja confirma preço e estoque pelo WhatsApp.";

export const FAQ_PRODUTO: readonly FaqProduto[] = [
  {
    q: "Preciso pagar agora?",
    a: "Não. A reserva não cobra nada no site. O pagamento é no balcão ou na entrega.",
  },
  {
    q: "Posso retirar ou receber em casa?",
    a: "Pode retirar na loja Nações Unidas. Para receber em casa, a loja combina taxa e prazo pelo WhatsApp.",
  },
  {
    q: "Quem confirma preço e estoque?",
    a: "A loja confirma preço e estoque pelo WhatsApp.",
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

export function descricaoMetadata(nome: string): string {
  return `${nome} na União Farma Nações Unidas, Sabará. ${NOTA_PRECO}`;
}

/** Product sem nota, sem estoque e sem oferta. O preço fica na página, não no schema. */
export function jsonLdProduto(input: { nome: string; lab: string; categoria: string; url: string; image?: string | null }): Record<string, unknown> {
  const dados: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.nome,
    category: input.categoria,
    url: input.url,
    description: descricaoMetadata(input.nome),
  };
  const marca = input.lab.trim();
  if (marca) dados.brand = { "@type": "Brand", name: marca };
  if (input.image) dados.image = input.image;
  return dados;
}
