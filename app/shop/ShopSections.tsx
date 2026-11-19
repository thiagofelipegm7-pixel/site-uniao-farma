"use client";

import { useEffect, useState } from "react";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

/** Temas de saúde apresentados na navegação por categoria. */
type Categoria = { href: string; rotulo: string; iconeSrc: string };

const CATEGORIAS: readonly Categoria[] = [
  { href: "/nacoes-unidas/produtos?q=diabetes", rotulo: "Cuidados com diabetes", iconeSrc: "/categorias/diabetes.jpg" },
  { href: "/nacoes-unidas/produtos?q=cora%C3%A7%C3%A3o", rotulo: "Cuidados com o coração", iconeSrc: "/categorias/coracao.jpg" },
  { href: "/nacoes-unidas/produtos?q=est%C3%B4mago", rotulo: "Cuidados com o estômago", iconeSrc: "/categorias/estomago.jpg" },
  { href: "/nacoes-unidas/produtos?q=f%C3%ADgado", rotulo: "Cuidados com o fígado", iconeSrc: "/categorias/figado.jpg" },
  { href: "/nacoes-unidas/produtos?q=ossos", rotulo: "Cuidados com os ossos", iconeSrc: "/categorias/ossos.jpg" },
  { href: "/nacoes-unidas/produtos?q=rins", rotulo: "Cuidados com os rins", iconeSrc: "/categorias/rins.jpg" },
  { href: "/departamentos/dermocosmeticos", rotulo: "Derma Cuidados", iconeSrc: "/categorias/derma.jpg" },
  { href: "/nacoes-unidas/produtos?q=respirat%C3%B3rios", rotulo: "Cuidados Respiratórios", iconeSrc: "/categorias/respiratorios.jpg" },
  { href: "/nacoes-unidas/produtos?q=olhos", rotulo: "Cuidados com os olhos", iconeSrc: "/categorias/olhos.jpg" },
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
