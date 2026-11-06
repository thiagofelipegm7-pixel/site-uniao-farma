"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { PUBLIC_UNITS } from "../site-config";
import { getUnitPublicPath } from "../structured-data";
import UnitStatusBadge from "../UnitStatusBadge";

/** "Nossas lojas" do protótipo: nome, endereço e se está aberta. O cartão inteiro leva à página da loja. */
export default function LojasCartoes() {
  return (
    <section className="shop-lojas" id="unidades-rapidas" aria-labelledby="nossas-lojas-titulo">
      <h2 id="nossas-lojas-titulo">Nossas lojas</h2>
      <ul>
        {PUBLIC_UNITS.map((unit) => {
          return (
            <li key={unit.id} className="shop-loja-cartao">
              <h3>
                <a href={getUnitPublicPath(unit)}>{unit.shortName}</a>
              </h3>
              <p>{unit.shortAddress}</p>
              <UnitStatusBadge unit={unit} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
