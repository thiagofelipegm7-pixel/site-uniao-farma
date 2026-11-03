/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { IconBrilho, IconComprimido, IconEtiqueta, IconGota, IconKit, IconSabonete } from "../reserva/ReservaIcons";

const CATEGORIAS = [
  { href: "/ofertas", rotulo: "Ofertas", Icone: IconEtiqueta, destaque: true },
  { href: "/nacoes-unidas/produtos#perfumaria-e-higiene", rotulo: "Higiene", Icone: IconSabonete, destaque: false },
  { href: "/nacoes-unidas/produtos#pele-e-protecao-solar", rotulo: "Dermo­cosméticos", Icone: IconGota, destaque: false },
  { href: "/nacoes-unidas/produtos#medicamentos-isentos-de-prescricao", rotulo: "MIPs", Icone: IconComprimido, destaque: false },
  { href: "/nacoes-unidas/produtos#suplementos-e-alimentos", rotulo: "Suplementos", Icone: IconBrilho, destaque: false },
  { href: "/nacoes-unidas/produtos#correlatos-e-outros", rotulo: "Correlatos", Icone: IconKit, destaque: false },
] as const;

/** Linha rolável de categorias (ícone e rótulo), como no protótipo. */
export function CategoriasLinha() {
  return (
    <nav className="shop-categorias" id="departamentos" aria-labelledby="categorias-titulo">
      <h2 id="categorias-titulo">Navegue por categoria</h2>
      <ul>
        {CATEGORIAS.map(({ href, rotulo, Icone, destaque }) => (
          <li key={rotulo}>
            <a href={href}>
              <span className={destaque ? "shop-cat-icone is-oferta" : "shop-cat-icone"}>
                <Icone size={30} />
              </span>
              <span className="shop-cat-rotulo">{rotulo}</span>
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
        <p>3 lojas em Sabará · retirada ou entrega no bairro.</p>
      </div>
      <a href="/nacoes-unidas/produtos">Ver produtos</a>
    </section>
  );
}
