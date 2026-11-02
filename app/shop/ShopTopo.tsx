"use client";

import BrandStrip from "../BrandStrip";
import ShopHeader from "./ShopHeader";

/** Casca do topo das páginas de compra: cabeçalho com busca e sacola, faixa do lema (a barra da loja é só da home). */
export default function ShopTopo({ consultaInicial = "" }: { consultaInicial?: string }) {
  return (
    <>
      <ShopHeader consultaInicial={consultaInicial} />
      <BrandStrip semSacola />
    </>
  );
}
