"use client";

import BrandStrip from "../BrandStrip";
import LojaBar from "./LojaBar";
import ShopHeader from "./ShopHeader";

/** Casca do topo das páginas de compra: cabeçalho com busca e sacola, faixa do lema e barra da loja. */
export default function ShopTopo({ consultaInicial = "" }: { consultaInicial?: string }) {
  return (
    <>
      <ShopHeader consultaInicial={consultaInicial} />
      <BrandStrip semSacola />
      <LojaBar />
    </>
  );
}
