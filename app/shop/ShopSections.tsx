/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { IconBrilho, IconComprimido, IconEtiqueta, IconGota, IconSabonete } from "../reserva/ReservaIcons";

const CATEGORIAS = [
  { href: "/ofertas", rotulo: "Ofertas", Icone: IconEtiqueta, destaque: true },
  { href: "/nacoes-unidas/produtos#perfumaria-e-higiene", rotulo: "Higiene", Icone: IconSabonete, destaque: false },
  { href: "/nacoes-unidas/produtos#pele-e-protecao-solar", rotulo: "Dermo­cosméticos", Icone: IconGota, destaque: false },
  { href: "/nacoes-unidas/produtos#medicamentos-isentos-de-prescricao", rotulo: "MIPs", Icone: IconComprimido, destaque: false },
  { href: "/nacoes-unidas/produtos#suplementos-e-alimentos", rotulo: "Perfumaria", Icone: IconBrilho, destaque: false },
] as const;

/** Linha rolável de categorias (ícone e rótulo), como no protótipo. */
export function CategoriasLinha() {
  return (
    <nav className="shop-categorias" aria-label="Categorias">
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
          Reserve pelo WhatsApp.
          <br />
          Pague só na loja.
        </h1>
        <p>3 lojas em Sabará · retirada ou entrega no bairro.</p>
      </div>
      <a href="/nacoes-unidas/produtos">Ver produtos</a>
    </section>
  );
}

const PASSOS = [
  { titulo: "Escolha e adicione", texto: "Monte a sua reserva." },
  { titulo: "Escolha a loja", texto: "Retirar na loja ou receber no seu bairro." },
  { titulo: "Envie pelo WhatsApp", texto: "A loja confirma. Pague no balcão ou na entrega." },
] as const;

export function ComoFunciona() {
  return (
    <section className="shop-passos" aria-labelledby="como-funciona-titulo">
      <h2 id="como-funciona-titulo">Como funciona</h2>
      <ol>
        {PASSOS.map((passo, i) => (
          <li key={passo.titulo}>
            <span className="shop-passo-n" aria-hidden="true">{i + 1}</span>
            <div>
              <strong>{passo.titulo}</strong>
              <p>{passo.texto}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="shop-passos-nota">
        Aqui só itens sem receita: medicamentos isentos de prescrição (MIPs), higiene e dermocosméticos. Leia a bula. Em caso de dúvida, procure o farmacêutico.
      </p>
    </section>
  );
}
