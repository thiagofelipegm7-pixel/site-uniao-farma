"use client";

import { useEffect, useState } from "react";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

/** Fotos das 7 categorias (public/categorias), separadas da prancha aprovada. */
type Categoria = { href: string; rotulo: string; iconeSrc: string };

const CATEGORIAS: readonly Categoria[] = [
  { href: "/departamentos/medicamentos", rotulo: "Medicamentos", iconeSrc: "/categorias/medicamentos.jpg" },
  { href: "/departamentos/dermocosmeticos", rotulo: "Dermo­cosméticos", iconeSrc: "/categorias/dermocosmeticos.jpg" },
  { href: "/departamentos/perfumes", rotulo: "Perfumes", iconeSrc: "/categorias/perfumes.jpg" },
  { href: "/departamentos/infantil-e-gestante", rotulo: "Infantil e Gestante", iconeSrc: "/categorias/infantil-e-gestante.jpg" },
  { href: "/departamentos/beleza", rotulo: "Beleza", iconeSrc: "/categorias/beleza.jpg" },
  { href: "/departamentos/cuidado-diario", rotulo: "Cuidado Diário", iconeSrc: "/categorias/cuidado-diario.jpg" },
  { href: "/departamentos/bem-estar", rotulo: "Bem Estar", iconeSrc: "/categorias/bem-estar.jpg" },
];

/**
 * Faixa horizontal de categorias (cards menores, scroll-snap).
 * No celular ~3,6 cards visíveis; no desktop cards ~26% menores, rolagem lateral se não couber.
 */
export function CategoriasLinha() {
  return (
    <nav className="shop-categorias" id="departamentos" aria-labelledby="categorias-titulo">
      <h2 id="categorias-titulo">Navegue por categoria</h2>
      <ul className="shop-categorias-trilho">
        {CATEGORIAS.map((item) => (
          <li key={item.rotulo}>
            <a href={item.href}>
              <span className="shop-cat-icone shop-cat-foto">
                {/* alt vazio: o rótulo visível abaixo já nomeia a categoria. */}
                <img src={item.iconeSrc} alt="" width={265} height={477} loading="lazy" decoding="async" draggable={false} />
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
