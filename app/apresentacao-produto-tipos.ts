export type ApresentacaoProduto = {
  id: string;
  nome: string;
  fotoOrdem: number;
  precoCentavos: number;
};

export type ApresentacaoPublica = ApresentacaoProduto & {
  ean: string;
  foto: string | null;
};
