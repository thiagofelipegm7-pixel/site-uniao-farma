"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { IconEtiqueta } from "../reserva/ReservaIcons";

/** Ícones das 7 categorias: extratos da prancha aprovada. Ofertas mantém o ícone Phosphor. */
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

/**
 * Faixa horizontal de categorias (cards grandes, scroll-snap).
 * No celular ~2,7 cards visíveis; no desktop cards maiores em linha com rolagem lateral se não couber.
 */
export function CategoriasLinha() {
  return (
    <nav className="shop-categorias" id="departamentos" aria-labelledby="categorias-titulo">
      <h2 id="categorias-titulo">Navegue por categoria</h2>
      <ul className="shop-categorias-trilho">
        {CATEGORIAS.map((item) => (
          <li key={item.rotulo}>
            <a href={item.href}>
              <span className={item.destaque ? "shop-cat-icone is-oferta" : "shop-cat-icone"}>
                {item.destaque ? (
                  <item.Icone size={48} />
                ) : (
                  // alt vazio: o rótulo visível abaixo já nomeia a categoria.
                  <img src={item.iconeSrc} alt="" width={96} height={96} decoding="async" draggable={false} />
                )}
              </span>
              <span className="shop-cat-rotulo">{item.rotulo}</span>
            </a>
          </li>
        ))}
      </ul>
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
