/**
 * Três fatos conferidos no site, usados nos ticks da cesta e na faixa do catálogo.
 * Nada é inventado: retirada grátis e pagamento no balcão/entrega já aparecem na home e no checkout;
 * trocas e devoluções têm página própria (com as regras da loja, inclusive a restrição de medicamento).
 */
export const LINHAS_CONFIANCA = [
  { texto: "Retire grátis na loja" },
  { texto: "Pague no balcão ou na entrega" },
  { texto: "Trocas e devoluções", href: "/trocas-e-devolucoes" },
] as const;
