"use client";

import ShopHeader from "./shop/ShopHeader";

type ContentPath = "/ofertas" | "/novidades" | "/receita";

/**
 * Cabeçalho das páginas institucionais (lojas, ofertas, receita, perguntas...). Plano de finalização, item 7: o site tinha
 * duas identidades visuais; agora todas as páginas usam o mesmo cabeçalho da loja (busca, localização e cesta).
 */
export function ContentSiteHeader({ activePath }: { activePath?: ContentPath }) {
  void activePath;
  return <ShopHeader />;
}

export function ContentSiteFooter(props: { notice?: string }) {
  void props.notice;
  return null;
}
