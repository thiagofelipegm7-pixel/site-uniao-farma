"use client";

import { useEffect, useState } from "react";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

/** Ícones das 7 categorias: extratos da prancha aprovada. */
type Categoria = { href: string; rotulo: string; iconeSrc: string };

const CATEGORIAS: readonly Categoria[] = [
  { href: "/departamentos/medicamentos", rotulo: "Medicamentos", iconeSrc: "/icons/categorias/medicamentos.webp" },
  { href: "/departamentos/dermocosmeticos", rotulo: "Dermo­cosméticos", iconeSrc: "/icons/categorias/dermocosmeticos.webp" },
  { href: "/departamentos/perfumes", rotulo: "Perfumes", iconeSrc: "/icons/categorias/perfumes.webp" },
  { href: "/departamentos/infantil-e-gestante", rotulo: "Infantil e Gestante", iconeSrc: "/icons/categorias/infantil-gestante.webp" },
  { href: "/departamentos/beleza", rotulo: "Beleza", iconeSrc: "/icons/categorias/beleza.webp" },
  { href: "/departamentos/cuidado-diario", rotulo: "Cuidado Diário", iconeSrc: "/icons/categorias/cuidado-diario.webp" },
  { href: "/departamentos/bem-estar", rotulo: "Bem Estar", iconeSrc: "/icons/categorias/bem-estar.webp" },
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
              <span className="shop-cat-icone">
                {/* alt vazio: o rótulo visível abaixo já nomeia a categoria. */}
                <img src={item.iconeSrc} alt="" width={96} height={96} decoding="async" draggable={false} />
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
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/banners-publico", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { banners?: { id: string; url: string }[] }) => {
        const hero = d.banners?.find((b) => b.id === "hero");
        if (hero) setBanner(hero.url);
      })
      .catch(() => {});
  }, []);
  if (banner) {
    return (
      <section className="shop-hero" id="inicio">
        <a href="/nacoes-unidas/produtos"><img src={banner} alt="Oferta da União Farma" style={{ width: "100%", height: "auto", borderRadius: "8px" }} /></a>
      </section>
    );
  }
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
