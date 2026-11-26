"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import { useState } from "react";
import { Logo } from "./MarcasLinha";
import { SetasRolagem } from "./SetasRolagem";
import { MARCAS_DESTAQUE, type MarcaDestaque } from "./marcas";

/** "Marcas que trabalhamos": cartões com o logo de cada marca do catálogo. Cada cartão abre a busca da marca. */
export default function MarcasTrabalhamos({ marcas = MARCAS_DESTAQUE }: { marcas?: readonly MarcaDestaque[] }) {
  const [trilho, setTrilho] = useState<HTMLUListElement | null>(null);
  return (
    <section className="pdp-marcas section-inner" aria-labelledby="marcas-trabalhamos-titulo">
      <div className="pdp-marcas-topo">
        <h2 id="marcas-trabalhamos-titulo">Marcas que trabalhamos</h2>
        <SetasRolagem alvo={trilho} rotulo="Marcas que trabalhamos" />
      </div>
      <ul className="pdp-marcas-lista" ref={setTrilho}>
        {marcas.map((marca) => (
          <li key={marca.slug}>
            <a className="pdp-marca-card" href={marca.href ?? `/nacoes-unidas/produtos?q=${encodeURIComponent(marca.busca)}`}>
              <span className="pdp-marca-logo"><Logo marca={marca} /></span>
              <strong>{marca.nome}</strong>
              <span className="pdp-marca-ir">Ver produtos</span>
            </a>
          </li>
        ))}
      </ul>
      <a className="pdp-perguntas-todas" href="/nacoes-unidas/produtos">
        <span>Ver todos os produtos</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </a>
    </section>
  );
}
