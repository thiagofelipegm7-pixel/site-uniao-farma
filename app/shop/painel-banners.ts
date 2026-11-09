/**
 * Banners do painel da home. A estrutura copia o carrossel da Droga Raia (proporção, setas redondas nas laterais,
 * pontos embaixo, sem loop). A arte fica em branco: quando houver imagem, preencha `imagem` (e `imagemCelular`),
 * o texto alternativo em `alt` e o destino em `href`. Sem `imagem`, o espaço aparece vazio.
 */
export type BannerPainel = {
  id: string;
  /** Descrição da arte para leitores de tela. Sem imagem, descreve o espaço reservado. */
  alt: string;
  /** Imagem larga (computador). Proporção 4,4 : 1, ex.: 1580 x 360. */
  imagem?: string;
  /** Imagem do celular. Proporção 2 : 1, ex.: 800 x 400. Sem ela, usa a larga. */
  imagemCelular?: string;
  /** Destino do clique. Sem destino, o banner não é link. */
  href?: string;
};

export const BANNERS_PAINEL: BannerPainel[] = [
  { id: "banner-1", alt: "Espaço de banner 1" },
  { id: "banner-2", alt: "Espaço de banner 2" },
  { id: "banner-3", alt: "Espaço de banner 3" },
  { id: "banner-4", alt: "Espaço de banner 4" },
];
