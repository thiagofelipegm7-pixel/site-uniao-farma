/**
 * Avaliações públicas do Google das 3 lojas, para o bloco da cesta e do checkout.
 *
 * Como atualizar: copie o texto exatamente como está no perfil da loja no Google.
 * Pode encurtar com "...". Só entre avaliações de 5 estrelas sobre atendimento,
 * entrega, retirada, rapidez ou preço justo em geral. Não inclua texto que cite
 * remédio, efeito, cura ou indicação. Mostre só o primeiro nome e a inicial do
 * sobrenome. A data e as notas abaixo são as coletadas na data indicada.
 */

export type AvaliacaoGoogle = {
  id: string;
  /** Primeiro nome e inicial do sobrenome, como aparece na cesta. */
  nomeExibicao: string;
  /** Nome completo como no Google, só para conferência. Não aparece na tela. */
  autorOriginal: string;
  unitId: "fatima" | "nacoes" | "itacolomi";
  loja: string;
  /** Nome do estabelecimento no Google, se for diferente do nome da loja no site. */
  nomeNoGoogle?: string;
  estrelas: 5;
  /** Texto fiel da avaliação pública. */
  texto: string;
  fonte: "avaliação no Google";
  urlAvaliacoes: string;
  coletadaEm: string;
};

export type NotaGoogleLoja = {
  unitId: "fatima" | "nacoes" | "itacolomi";
  loja: string;
  nota: number;
  quantidade: number;
  urlAvaliacoes: string;
  /** Nome do estabelecimento no Google, se for diferente do nome da loja no site. */
  nomeNoGoogle?: string;
};

/** Coletado dos perfis públicos no Google em 25/11/2026. */
export const COLETADO_EM = "2026-11-25";

export const URL_AVALIACOES_GOOGLE = {
  fatima: "https://search.google.com/local/reviews?placeid=ChIJ_ZzVyK6cpgAR-xi4EC94uOY",
  nacoes: "https://search.google.com/local/reviews?placeid=ChIJgRmPJJ6cpgAR3F5qwsuwne4",
  /** Perfil da loja Itacolomi no Google; o estabelecimento ainda aparece como Droga Manaus. */
  itacolomi: "https://search.google.com/local/reviews?placeid=ChIJx-yyFL-cpgARNU9SuMcVkd0",
} as const;

/**
 * Notas e totais oficiais de cada loja no Google, nesta data.
 * Não some numa média única: mostre as três notas, citando o Google.
 */
export const NOTAS_GOOGLE_LOJAS: NotaGoogleLoja[] = [
  {
    unitId: "fatima",
    loja: "Fátima",
    nota: 4.6,
    quantidade: 20,
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.fatima,
  },
  {
    unitId: "nacoes",
    loja: "Nações Unidas",
    nota: 4.8,
    quantidade: 31,
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.nacoes,
  },
  {
    unitId: "itacolomi",
    loja: "Itacolomi",
    nota: 4.6,
    quantidade: 12,
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.itacolomi,
    nomeNoGoogle: "Droga Manaus",
  },
];

/** Ordem de exibição: as primeiras entram no bloco compacto. */
export const AVALIACOES_CESTA: AvaliacaoGoogle[] = [
  {
    id: "nacoes-beatriz-c",
    nomeExibicao: "Beatriz C.",
    autorOriginal: "Beatriz Cristina",
    unitId: "nacoes",
    loja: "Nações Unidas",
    estrelas: 5,
    texto: "Atendimento excelente, todos são muito gentis as entregas chegam rapidamente",
    fonte: "avaliação no Google",
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.nacoes,
    coletadaEm: COLETADO_EM,
  },
  {
    id: "fatima-renan-s",
    nomeExibicao: "Renan S.",
    autorOriginal: "Renan Soares",
    unitId: "fatima",
    loja: "Fátima",
    estrelas: 5,
    texto: "Excelente farmácia, ótimos preços e excelente atendimento.",
    fonte: "avaliação no Google",
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.fatima,
    coletadaEm: COLETADO_EM,
  },
  {
    id: "itacolomi-regis-a",
    nomeExibicao: "Régis A.",
    autorOriginal: "Régis André",
    unitId: "itacolomi",
    loja: "Itacolomi",
    nomeNoGoogle: "Droga Manaus",
    estrelas: 5,
    texto: "Excelente atendimento, preços e promoções. Recomendo.",
    fonte: "avaliação no Google",
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.itacolomi,
    coletadaEm: COLETADO_EM,
  },
  {
    id: "nacoes-rodrigo-s",
    nomeExibicao: "Rodrigo S.",
    autorOriginal: "Rodrigo saraiva",
    unitId: "nacoes",
    loja: "Nações Unidas",
    estrelas: 5,
    texto: "Preço bom e entrega rápida e sem contar com o ótimo atendimento.",
    fonte: "avaliação no Google",
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.nacoes,
    coletadaEm: COLETADO_EM,
  },
  {
    id: "fatima-flaviana-s",
    nomeExibicao: "Flaviana S.",
    autorOriginal: "Flaviana Souza",
    unitId: "fatima",
    loja: "Fátima",
    estrelas: 5,
    texto: "Excelente atendimento 🥰",
    fonte: "avaliação no Google",
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.fatima,
    coletadaEm: COLETADO_EM,
  },
  {
    id: "itacolomi-michelle-b",
    nomeExibicao: "Michelle B.",
    autorOriginal: "Michelle Batista Telles",
    unitId: "itacolomi",
    loja: "Itacolomi",
    nomeNoGoogle: "Droga Manaus",
    estrelas: 5,
    texto: "Atendimento perfeito",
    fonte: "avaliação no Google",
    urlAvaliacoes: URL_AVALIACOES_GOOGLE.itacolomi,
    coletadaEm: COLETADO_EM,
  },
];

export function formatarNotaGoogle(nota: number): string {
  return nota.toFixed(1).replace(".", ",");
}

export function textoNotasGoogle(notas: readonly NotaGoogleLoja[] = NOTAS_GOOGLE_LOJAS): string {
  const partes = notas.map((loja) => `${loja.loja} ${formatarNotaGoogle(loja.nota)} (${loja.quantidade})`);
  return `Notas no Google: ${partes.join(" · ")}`;
}

export function avaliacoesParaExibir(quantidade: number, lista: readonly AvaliacaoGoogle[] = AVALIACOES_CESTA): AvaliacaoGoogle[] {
  return lista.slice(0, quantidade);
}
