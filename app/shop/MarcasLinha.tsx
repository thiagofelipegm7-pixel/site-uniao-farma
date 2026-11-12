"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Logos pequenos e estáticos. */
import { useState } from "react";
import { SetasRolagem } from "./SetasRolagem";
import { EXTENSOES_LOGO, MARCAS_DESTAQUE, type MarcaDestaque } from "./marcas";

/** Logo da marca: tenta png, svg, webp e jpg; sem nenhum, mostra o nome em texto. */
function Logo({ marca }: { marca: MarcaDestaque }) {
  const [tentativa, setTentativa] = useState(0);
  if (tentativa >= EXTENSOES_LOGO.length) return <span className="shop-marca-nome">{marca.nome}</span>;
  return (
    <img
      src={`/marcas/${marca.slug}.${EXTENSOES_LOGO[tentativa]}`}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setTentativa((n) => n + 1)}
      // O 404 pode chegar antes da hidratação (onError já passou): confere o estado ao montar.
      ref={(el) => {
        if (el && el.complete && el.naturalWidth === 0) setTentativa((n) => n + 1);
      }}
    />
  );
}

/** Faixa de logos das marcas com mais produtos em estoque. Cada logo abre a busca da marca. */
export function MarcasLinha({ marcas = MARCAS_DESTAQUE }: { marcas?: readonly MarcaDestaque[] } = {}) {
  const [trilho, setTrilho] = useState<HTMLUListElement | null>(null);
  return (
    <nav className="shop-marcas" aria-labelledby="marcas-titulo">
      <div className="shop-marcas-topo">
        <h2 id="marcas-titulo">Navegue por marcas</h2>
        <SetasRolagem alvo={trilho} rotulo="Navegue por marcas" />
      </div>
      <div className="shop-marcas-moldura">
        <ul className="shop-marcas-trilho" ref={setTrilho}>
          {marcas.map((marca) => (
            <li key={marca.slug}>
              <a className={marca.cheia ? "is-cheia" : undefined} href={marca.href ?? `/nacoes-unidas/produtos?q=${encodeURIComponent(marca.busca)}`} aria-label={`Ver produtos ${marca.nome}`}>
                <Logo marca={marca} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
