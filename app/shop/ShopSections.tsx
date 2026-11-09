"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { IconEtiqueta, IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";

/** Ícones das 7 categorias: extratos da prancha aprovada, recoloridos com tokens União Farma. Ofertas mantém o ícone Phosphor. */
type Categoria =
  | { href: string; rotulo: string; destaque: true; Icone: typeof IconEtiqueta }
  | { href: string; rotulo: string; destaque: false; iconeSrc: string };

const CATEGORIAS: readonly Categoria[] = [
  { href: "/ofertas", rotulo: "Ofertas", Icone: IconEtiqueta, destaque: true },
  { href: "/departamentos/medicamentos", rotulo: "Medicamentos", iconeSrc: "/icons/categorias/medicamentos.webp", destaque: false },
  { href: "/departamentos/dermocosmeticos", rotulo: "Dermo­cosméticos", iconeSrc: "/icons/categorias/dermocosmeticos.webp", destaque: false },
  { href: "/departamentos/perfumes", rotulo: "Perfumes", iconeSrc: "/icons/categorias/perfumes.webp", destaque: false },
  { href: "/departamentos/infantil-e-gestante", rotulo: "Infantil e Gestante", iconeSrc: "/icons/categorias/infantil-gestante.webp", destaque: false },
  { href: "/departamentos/beleza", rotulo: "Beleza", iconeSrc: "/icons/categorias/beleza.webp", destaque: false },
  { href: "/departamentos/cuidado-diario", rotulo: "Cuidado Diário", iconeSrc: "/icons/categorias/cuidado-diario.webp", destaque: false },
  { href: "/departamentos/bem-estar", rotulo: "Bem Estar", iconeSrc: "/icons/categorias/bem-estar.webp", destaque: false },
];

const VISIVEIS = 7; // quadros à vista no desktop largo (5 abaixo de 1440 px); a fila tem cópias para os dois casos
const PASSO = 2; // quadros por clique (como o carrossel da Panvel)
const DURACAO_MS = 450;

/**
 * "Navegue por categoria" como o carrossel da Panvel (vídeo de 03/11): no desktop, 5 quadros por vez (7 a partir de 1440 px), setas nas pontas,
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
            {fila.map(({ item, copia }, k) => (
              <li key={`${item.rotulo}-${k}`} className={copia ? "shop-cat-copia" : undefined} aria-hidden={copia ? true : undefined}>
                <a href={item.href} tabIndex={copia ? -1 : undefined}>
                  <span className={item.destaque ? "shop-cat-icone is-oferta" : "shop-cat-icone"}>
                    {item.destaque ? (
                      <item.Icone size={30} />
                    ) : (
                      // alt vazio: o rótulo visível ao lado já nomeia a categoria (evita eco no leitor de tela).
                      <img src={item.iconeSrc} alt="" width={96} height={96} decoding="async" draggable={false} />
                    )}
                  </span>
                  <span className="shop-cat-rotulo">{item.rotulo}</span>
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
      </div>
      <a href="/nacoes-unidas/produtos">Ver produtos</a>
    </section>
  );
}
