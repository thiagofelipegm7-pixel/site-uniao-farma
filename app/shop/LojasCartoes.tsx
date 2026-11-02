"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { UNIT_GOOGLE_PROFILES } from "../google-reviews";
import { UNITS } from "../site-config";
import { getUnitPublicPath } from "../structured-data";
import UnitStatusBadge from "../UnitStatusBadge";
import { IconEstrela } from "../reserva/ReservaIcons";

/** "Nossas lojas" do protótipo: nome, endereço, nota do Google e se está aberta. O cartão inteiro leva à página da loja. */
export default function LojasCartoes() {
  return (
    <section className="shop-lojas" id="unidades-rapidas" aria-labelledby="nossas-lojas-titulo">
      <h2 id="nossas-lojas-titulo">Nossas lojas</h2>
      <ul>
        {UNITS.map((unit) => {
          const perfil = UNIT_GOOGLE_PROFILES.find((item) => item.unitId === unit.id);
          return (
            <li key={unit.id} className="shop-loja-cartao">
              <h3>
                <a href={getUnitPublicPath(unit)}>{unit.shortName}</a>
              </h3>
              <p>{unit.shortAddress}</p>
              {perfil?.rating != null ? (
                <p className="shop-loja-nota">
                  <IconEstrela size={16} /> {perfil.rating.toFixed(1).replace(".", ",")}
                  {perfil.reviewCount != null ? ` · ${perfil.reviewCount} avaliações no Google` : " no Google"}
                </p>
              ) : null}
              <UnitStatusBadge unit={unit} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
