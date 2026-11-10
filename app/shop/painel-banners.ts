/**
 * Banners do painel da home. A estrutura copia o carrossel principal da Droga Raia: 14 banners, um por vez, setas redondas nas laterais, pontos embaixo. A arte fica em branco: quando houver imagem, preencha `imagem` (e `imagemCelular`),
 * o texto alternativo em `alt` e o destino em `href`. Sem `imagem`, o espaço aparece vazio.
 */
export type BannerPainel = {
  id: string;
  /** Descrição da arte para leitores de tela. Sem imagem, descreve o espaço reservado. */
  alt: string;
  /** Imagem do computador (um banner por vez). Proporção 4,39 : 1, como a da Droga Raia: 1318 x 300 px na tela, envie 2636 x 600 px (2x). */
  imagem?: string;
  /** Imagem do celular (até 767 px de largura). Proporção 2 : 1, ex.: 800 x 400. Sem ela, usa a do computador. */
  imagemCelular?: string;
  /** Destino do clique. Sem destino, o banner não é link. */
  href?: string;
};

export const BANNERS_PAINEL: BannerPainel[] = Array.from({ length: 14 }, (_, i) => ({ id: `banner-${i + 1}`, alt: `Espaço de banner ${i + 1}` }));
