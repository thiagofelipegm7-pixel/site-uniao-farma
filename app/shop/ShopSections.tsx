"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { IconBrilho, IconComprimido, IconEtiqueta, IconGota, IconKit, IconSabonete, IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";

const CATEGORIAS = [
  { href: "/ofertas", rotulo: "Ofertas", Icone: IconEtiqueta, destaque: true },
  { href: "/nacoes-unidas/produtos#perfumaria-e-higiene", rotulo: "Higiene", Icone: IconSabonete, destaque: false },
  { href: "/nacoes-unidas/produtos#pele-e-protecao-solar", rotulo: "Dermo­cosméticos", Icone: IconGota, destaque: false },
  { href: "/nacoes-unidas/produtos#medicamentos-isentos-de-prescricao", rotulo: "MIPs", Icone: IconComprimido, destaque: false },
  { href: "/nacoes-unidas/produtos#suplementos-e-alimentos", rotulo: "Suplementos", Icone: IconBrilho, destaque: false },
  { href: "/nacoes-unidas/produtos#correlatos-e-outros", rotulo: "Correlatos", Icone: IconKit, destaque: false },
] as const;

const VISIVEIS = 5; // quadros à vista no desktop
const PASSO = 2; // quadros por clique (como o carrossel da Panvel)
const DURACAO_MS = 450;

/**
 * "Navegue por categoria" como o carrossel da Panvel (vídeo de 03/11): no desktop, 5 quadros por vez, setas nas pontas,
 * cada clique avança 2 quadros com deslize suave e a lista dá a volta sem fim. No celular segue como linha rolável
 * (as setas e os quadros repetidos ficam escondidos).
 */
export function CategoriasLinha() {
  const total = CATEGORIAS.length;
  const [inicio, setInicio] = useState(0);
  const trilho = useRef<HTMLUListElement>(null);
  const ocupado = useRef(false);

  // Quadros reais seguidos de cópias (só para preencher a janela durante o deslize).
  const fila = Array.from({ length: total + VISIVEIS + PASSO }, (_, k) => ({ item: CATEGORIAS[(inicio + k) % total], copia: k >= total }));

  function mover(sentido: 1 | -1) {
    const el = trilho.current;
    if (!el || ocupado.current) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const novoInicio = (inicio + sentido * PASSO + total) % total;
    const passo = `calc(${PASSO} * var(--cat-passo))`;
    if (reduzido) {
      setInicio(novoInicio);
      return;
    }
    ocupado.current = true;
    const terminar = () => {
      el.style.transition = "none";
      el.style.transform = "translateX(0)";
      ocupado.current = false;
    };
    if (sentido === 1) {
      el.style.transition = `transform ${DURACAO_MS}ms ease`;
      el.style.transform = `translateX(calc(-1 * ${passo}))`;
      window.setTimeout(() => {
        flushSync(() => setInicio(novoInicio));
        terminar();
      }, DURACAO_MS);
    } else {
      // Gira a fila para trás sem animar e desliza de volta para a posição inicial.
      flushSync(() => setInicio(novoInicio));
      el.style.transition = "none";
      el.style.transform = `translateX(calc(-1 * ${passo}))`;
      void el.offsetWidth;
      el.style.transition = `transform ${DURACAO_MS}ms ease`;
      el.style.transform = "translateX(0)";
      window.setTimeout(terminar, DURACAO_MS);
    }
  }

  return (
    <nav className="shop-categorias" id="departamentos" aria-labelledby="categorias-titulo">
      <h2 id="categorias-titulo">Navegue por categoria</h2>
      <div className="shop-categorias-corpo">
        <button type="button" className="shop-cat-seta" aria-label="Categorias anteriores" onClick={() => mover(-1)}>
          <IconVoltar size={18} />
        </button>
        <div className="shop-categorias-janela">
          <ul ref={trilho}>
            {fila.map(({ item: { href, rotulo, Icone, destaque }, copia }, k) => (
              <li key={`${rotulo}-${k}`} className={copia ? "shop-cat-copia" : undefined} aria-hidden={copia ? true : undefined}>
                <a href={href} tabIndex={copia ? -1 : undefined}>
                  <span className={destaque ? "shop-cat-icone is-oferta" : "shop-cat-icone"}>
                    <Icone size={30} />
                  </span>
                  <span className="shop-cat-rotulo">{rotulo}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <button type="button" className="shop-cat-seta" aria-label="Próximas categorias" onClick={() => mover(1)}>
          <IconSetaDireita size={18} />
        </button>
      </div>
    </nav>
  );
}

/** Cartão azul-marinho do topo. É o único h1 da home. */
export function HeroReserva() {
  return (
    <section className="shop-hero" id="inicio" aria-labelledby="hero-title">
      <div>
        <h1 id="hero-title">
          Peça pelo WhatsApp.
          <br />
          Pague só na loja.
        </h1>
        <p>3 lojas em Sabará · retirada ou entrega no bairro.</p>
      </div>
      <a href="/nacoes-unidas/produtos">Ver produtos</a>
    </section>
  );
}
