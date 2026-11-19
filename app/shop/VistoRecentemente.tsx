"use client";

import { useEffect, useState } from "react";
import DestaquesSemana from "./DestaquesSemana";
import { carregarVistos, limparVistos } from "../vistos-recentemente";

/**
 * Vitrine "Visto recentemente" da home: os produtos (que não são remédio) que a pessoa abriu neste aparelho, com preço e disponibilidade
 * de hoje. A lista fica só no navegador; "Limpar" apaga. Sem histórico, a seção não aparece.
 */
export default function VistoRecentemente() {
  const [slugs, setSlugs] = useState<string[]>([]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- o histórico só existe no navegador (a página é estática)
  useEffect(() => setSlugs(carregarVistos()), []);
  if (slugs.length === 0) return null;
  return (
    <DestaquesSemana
      id="vitrine-vistos"
      titulo="Visto recentemente"
      slugs={slugs}
      verTodas={false}
      source="home_vistos"
      acaoExtra={<button type="button" className="shop-vistos-limpar" onClick={() => { limparVistos(); setSlugs([]); }}>Limpar histórico</button>}
    />
  );
}
