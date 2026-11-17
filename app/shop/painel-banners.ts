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
  /** Imagem do celular (até 767 px de largura). Proporção 2 : 1, ex.: 800 x 400. Sem ela, usa a do computador, e a caixa do celular fica na proporção dela (949 : 239). */
  imagemCelular?: string;
  /** Destino do clique. Sem destino, o banner não é link. */
  href?: string;
  /** Nome acessível do link (ex.: "Ver produtos: Personal Baby"). */
  rotulo?: string;
};

export const BANNERS_PAINEL: BannerPainel[] = Array.from({ length: 14 }, (_, i) => ({ id: `banner-${i + 1}`, alt: `Espaço de banner ${i + 1}` }));

/** Endereço da busca do catálogo (a mesma do campo de busca do cabeçalho). */
export const hrefBusca = (termo: string) => `/nacoes-unidas/produtos?q=${encodeURIComponent(termo)}`;

/**
 * Termo de busca padrão de cada arte publicada, lido no texto da própria arte (o nome do arquivo não diz o produto).
 * Vale só enquanto a vaga usa essa arte: arte nova sem termo no painel leva para o catálogo inteiro.
 * Semavy (vaga 14, arte enviada pelo painel) fica de fora: é medicamento de prescrição e não pode ganhar destaque.
 */
export const BUSCA_PADRAO_POR_ARTE: Record<string, string> = {
  "WhatsApp_Image_2026-11-16_at_09.32.48_banner.jpg": "Decongex",
  "WhatsApp_Image_2026-11-16_at_09.32.49_1_banner.jpg": "Cognon",
  "WhatsApp_Image_2026-11-16_at_09.32.49_2_banner.jpg": "Personal Baby",
  "WhatsApp_Image_2026-11-16_at_09.32.49_3_banner.jpg": "Soneca",
  "WhatsApp_Image_2026-11-16_at_09.32.49_4_banner.jpg": "Confira",
  "WhatsApp_Image_2026-11-16_at_09.32.49_5_banner.jpg": "Buscopan",
  "WhatsApp_Image_2026-11-16_at_09.32.49_banner.jpg": "Agil C Kids",
  "WhatsApp_Image_2026-11-16_at_09.32.50_1_banner.jpg": "Salute",
  "WhatsApp_Image_2026-11-16_at_09.32.50_2_banner.jpg": "Xo Inseto",
  "WhatsApp_Image_2026-11-16_at_09.32.50_3_banner.jpg": "Eno Sal de Fruta",
  "WhatsApp_Image_2026-11-16_at_09.32.50_4_banner.jpg": "Strepsils",
  "WhatsApp_Image_2026-11-16_at_09.32.50_banner.jpg": "Creatina",
  "WhatsApp_Image_2026-11-16_at_09.32.51_1_banner.jpg": "Cimegripe",
};

/** Termo padrão pela arte: só para artes em arquivo (as enviadas pelo painel chegam como data URL e não têm nome). */
export function buscaPadraoDaArte(url: string) {
  if (url.startsWith("data:")) return null;
  const arquivo = decodeURIComponent(url.split("?")[0].split("/").pop() ?? "");
  return BUSCA_PADRAO_POR_ARTE[arquivo] ?? null;
}

/**
 * Para onde o banner leva, em ordem: termo de busca do painel → produto escolhido no painel → termo padrão da arte → catálogo.
 * `rotulo` vira o aria-label do link ("Ver produtos: Personal Baby").
 */
export function destinoBanner(b: { url: string; slug?: string | null; busca?: string | null }): { href: string; rotulo: string } {
  const busca = b.busca?.trim();
  if (busca) return { href: hrefBusca(busca), rotulo: `Ver produtos: ${busca}` };
  if (b.slug) return { href: `/nacoes-unidas/produtos/${b.slug}`, rotulo: "Ver produto em oferta" };
  const padrao = buscaPadraoDaArte(b.url);
  if (padrao) return { href: hrefBusca(padrao), rotulo: `Ver produtos: ${padrao}` };
  return { href: "/nacoes-unidas/produtos", rotulo: "Ver produtos da União Farma" };
}
