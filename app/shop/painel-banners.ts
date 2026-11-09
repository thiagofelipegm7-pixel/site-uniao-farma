/**
 * Banners do painel da home. A estrutura copia o carrossel da Droga Raia (setas redondas nas laterais, pontos embaixo). A arte fica em branco: quando houver imagem, preencha `imagem` (e `imagemCelular`),
 * o texto alternativo em `alt` e o destino em `href`. Sem `imagem`, o espaço aparece vazio.
 */
export type BannerPainel = {
  id: string;
  /** Descrição da arte para leitores de tela. Sem imagem, descreve o espaço reservado. */
  alt: string;
  /** Imagem do computador (dois banners lado a lado). Proporção 1,9 : 1, ex.: 960 x 505. */
  imagem?: string;
  /** Imagem do celular e do tablet (um banner por vez). Proporção 2 : 1, ex.: 800 x 400. Sem ela, usa a do computador. */
  imagemCelular?: string;
  /** Destino do clique. Sem destino, o banner não é link. */
  href?: string;
};

export const BANNERS_PAINEL: BannerPainel[] = [
  { id: "banner-1", alt: "Espaço de banner 1" },
  { id: "banner-2", alt: "Espaço de banner 2" },
  { id: "banner-3", alt: "Espaço de banner 3" },
  { id: "banner-4", alt: "Espaço de banner 4" },
  { id: "banner-5", alt: "Espaço de banner 5" },
  { id: "banner-6", alt: "Espaço de banner 6" },
];
