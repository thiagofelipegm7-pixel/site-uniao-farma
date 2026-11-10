"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Logos pequenos e estáticos. */
import { useRef, useState } from "react";
import { IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";
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
export function MarcasLinha() {
  const trilho = useRef<HTMLUListElement>(null);
  const rolar = (sentido: 1 | -1) => {
    const el = trilho.current;
    if (!el) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: sentido * el.clientWidth * 0.8, behavior: reduzir ? "auto" : "smooth" });
  };
  return (
    <nav className="shop-marcas" aria-labelledby="marcas-titulo">
      <h2 id="marcas-titulo">Navegue por marcas</h2>
      <div className="shop-marcas-moldura">
        <button type="button" className="shop-marcas-seta" aria-label="Marcas anteriores" onClick={() => rolar(-1)}>
          <IconVoltar size={18} />
        </button>
        <ul className="shop-marcas-trilho" ref={trilho}>
          {MARCAS_DESTAQUE.map((marca) => (
            <li key={marca.slug}>
              <a className={marca.cheia ? "is-cheia" : undefined} href={`/nacoes-unidas/produtos?q=${encodeURIComponent(marca.busca)}`} aria-label={`Ver produtos ${marca.nome}`}>
                <Logo marca={marca} />
              </a>
            </li>
          ))}
        </ul>
        <button type="button" className="shop-marcas-seta" aria-label="Próximas marcas" onClick={() => rolar(1)}>
          <IconSetaDireita size={18} />
        </button>
      </div>
    </nav>
  );
}
