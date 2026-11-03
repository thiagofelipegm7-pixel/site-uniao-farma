"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useState } from "react";
import { readPreferredUnitId } from "../preferred-unit";
import { IconCartao, IconLoja, IconMenu, IconMoto, IconPino, IconWhats } from "../reserva/ReservaIcons";
import { formatarCentavos, TAXA_ENTREGA_CENTAVOS } from "../reserva/reserva-store";
import { buildWhatsAppUrl, UNITS } from "../site-config";
import { abrirDepartamentos, abrirSeletorDeLoja } from "./loja-evento";

const nacoes = UNITS.find((unit) => unit.id === "nacoes");

/**
 * Barra de acessos do desktop, com os mesmos 7 espaços da Panvel: Departamentos, Enviar para, Meus Cupons, Kits e Combos,
 * Ofertas Exclusivas, Combine e Ganhe e Desconto de Laboratório. O que a União não tem fica em branco. Some no celular.
 */
export function SubmenuHome() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const sincronizar = () => setId(readPreferredUnitId());
    sincronizar();
    window.addEventListener("uf-preferred-unit", sincronizar);
    return () => window.removeEventListener("uf-preferred-unit", sincronizar);
  }, []);
  const unit = UNITS.find((item) => item.id === id);
  return (
    <nav className="shop-submenu" aria-label="Acessos rápidos">
      <div className="shop-submenu-conteudo">
        <button type="button" className="shop-submenu-dep" onClick={abrirDepartamentos}><IconMenu size={20} /><span>Departamentos</span></button>
        <button type="button" className="shop-submenu-loja" onClick={abrirSeletorDeLoja}>
          <IconPino size={20} />
          <span><small>Enviar para</small><strong>{unit ? unit.shortName : "Escolha sua loja"}</strong></span>
        </button>
        <ul>
          <li className="shop-submenu-vazio" aria-hidden="true" />
          <li className="shop-submenu-vazio" aria-hidden="true" />
          <li><a href="/ofertas">Ofertas Exclusivas</a></li>
          <li className="shop-submenu-vazio" aria-hidden="true" />
          <li className="shop-submenu-vazio" aria-hidden="true" />
        </ul>
      </div>
    </nav>
  );
}

/** Pílula de seções do topo. O texto "Para você" é o contexto do único h1 da página (o título do banner). */
export function AbasHome() {
  return (
    <nav className="shop-abas" aria-label="Seções da página">
      <a className="is-ativa" href="#inicio" aria-current="true"><span>Para você</span></a>
      <a href="#ofertas-da-semana"><span>Ofertas</span></a>
      <a href="#unidades-rapidas"><span>Lojas</span></a>
    </nav>
  );
}

/** Cartões de benefícios logo abaixo do banner (a "info bar" da Panvel). Só dados reais do site. */
export function BarraInfo() {
  return (
    <ul className="shop-info" aria-label="Como receber">
      <li>
        <a href="#unidades-rapidas"><IconLoja size={22} /><span><strong>Retire em loja</strong><small>3 lojas em Sabará</small></span></a>
      </li>
      <li>
        <a href="/entrega-de-medicamentos-em-sabara"><IconMoto size={22} /><span><strong>Entrega no bairro</strong><small>Taxa de {formatarCentavos(TAXA_ENTREGA_CENTAVOS)}</small></span></a>
      </li>
      <li>
        <div><IconCartao size={22} /><span><strong>Pix, dinheiro e cartão</strong><small>Na retirada ou na entrega</small></span></div>
      </li>
      <li>
        <a href={nacoes ? buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas!", { campaign: "home_info", content: "nacoes" }) : "#"} data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="home_info" target="_blank" rel="noreferrer">
          <IconWhats size={22} /><span><strong>Fale no WhatsApp</strong><small>{nacoes?.whatsapp}</small></span>
        </a>
      </li>
    </ul>
  );
}

/** "Como você quiser e quando você quiser": retirar ou receber. */
export function ComoQuiser() {
  return (
    <section className="shop-quiser" aria-labelledby="quiser-titulo">
      <h2 id="quiser-titulo">Como você quiser e quando você quiser</h2>
      <ul>
        <li>
          <a href="#unidades-rapidas">
            <span className="shop-quiser-icone"><IconLoja size={28} /></span>
            <span><strong>Retire em loja</strong><small>Escolha uma das 3 lojas de Sabará.</small></span>
          </a>
        </li>
        <li>
          <a href="/entrega-de-medicamentos-em-sabara">
            <span className="shop-quiser-icone"><IconMoto size={28} /></span>
            <span><strong>Receba em casa</strong><small>Entregamos nos bairros de Sabará.</small></span>
          </a>
        </li>
      </ul>
    </section>
  );
}

/** "Como entrar em contato": WhatsApp e telefone de cada loja. */
export function ComoContato() {
  return (
    <section className="shop-contato" aria-labelledby="contato-titulo">
      <h2 id="contato-titulo">Como entrar em contato</h2>
      <ul>
        {UNITS.map((unit) => (
          <li key={unit.id}>
            <strong>{unit.shortName}</strong>
            <a href={buildWhatsAppUrl(unit, `Oi, União Farma ${unit.shortName}!`, { campaign: "home_contato", content: unit.id })} data-track-event="whatsapp_click" data-track-unit={unit.id} data-track-source="home_contato" target="_blank" rel="noreferrer">
              <IconWhats size={20} /> WhatsApp {unit.whatsapp}
            </a>
            <a href={unit.phoneLink}>Telefone {unit.phone}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
