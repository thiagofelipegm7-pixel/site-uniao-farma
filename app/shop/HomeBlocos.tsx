"use client";


import { useEffect, useState } from "react";
import { getUnitOpenStatus } from "../unit-hours";
import { IconCartao, IconLoja, IconMoto, IconWhats } from "../reserva/ReservaIcons";
import { formatarCentavos, TAXA_ENTREGA_CENTAVOS } from "../reserva/reserva-store";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";
import DynamicMenu from "../components/DynamicMenu";

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes");

/* Os mesmos departamentos da gaveta "Departamentos" (sem Ofertas, que tem a própria página). */
const DEPARTAMENTOS_BARRA = [
  { nome: "Medicamentos", href: "/departamentos/medicamentos" },
  { nome: "Dermocosméticos", href: "/departamentos/dermocosmeticos" },
  { nome: "Perfumes", href: "/departamentos/perfumes" },
  { nome: "Infantil e Gestante", href: "/departamentos/infantil-e-gestante" },
  { nome: "Beleza", href: "/departamentos/beleza" },
  { nome: "Cuidado Diário", href: "/departamentos/cuidado-diario" },
  { nome: "Bem Estar", href: "/departamentos/bem-estar" },
];

/**
 * Barra de acessos do desktop: Departamentos. Some no celular.
 * Pedido da loja: só Departamentos nesta barra; /ofertas permanece no site.
 */
export function SubmenuHome() {
  return (
    <nav className="shop-submenu" aria-label="Acessos rápidos">
      <div className="shop-submenu-conteudo">
        <DynamicMenu barra itens={DEPARTAMENTOS_BARRA} />
      </div>
    </nav>
  );
}

/**
 * Faixa fina sob o cabeçalho com o que o cliente mais pergunta: a loja está aberta agora, quanto custa a entrega e como paga.
 * O horário vem do mesmo cálculo da cesta; antes de carregar no navegador, aparece só o resto.
 */
export function FaixaInfo() {
  const [agora, setAgora] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- a hora só existe no navegador (a página é estática)
  useEffect(() => setAgora(new Date()), []);
  const status = nacoes && agora ? getUnitOpenStatus(nacoes, agora) : null;
  return (
    <ul className="shop-faixa-info" aria-label="Informações da loja">
      {status ? (
        <li className={status.isOpen ? "is-aberta" : "is-fechada"}>
          <span className="shop-faixa-ponto" aria-hidden="true" />
          {status.label}
        </li>
      ) : null}
      <li>Retire grátis na loja</li>
      <li>Entrega a partir de {formatarCentavos(TAXA_ENTREGA_CENTAVOS)}</li>
      <li>Pague na entrega ou no balcão</li>
    </ul>
  );
}

/** Cartões de benefícios logo abaixo do banner (a "info bar" da Panvel). Só dados reais do site. */
export function BarraInfo() {
  return (
    <ul className="shop-info" aria-label="Como receber">
      <li>
        <a href="#unidades-rapidas"><IconLoja size={22} /><span><strong>Retire em loja</strong><small>Loja Nações Unidas, em Sabará</small></span></a>
      </li>
      <li>
        <a href="/entrega-de-medicamentos-em-sabara"><IconMoto size={22} /><span><strong>Entrega no bairro</strong><small>Taxa a partir de {formatarCentavos(TAXA_ENTREGA_CENTAVOS)}</small></span></a>
      </li>
      <li>
        <div><IconCartao size={22} /><span><strong>Pix, dinheiro e cartão</strong><small>Na retirada ou na entrega</small></span></div>
      </li>
      <li>
        <a href={nacoes ? buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas!", { campaign: "home_info", content: "nacoes" }) : "#"} data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="home_info" target="_blank" rel="noreferrer">
          <IconWhats size={22} oficial /><span><strong>Fale no WhatsApp</strong><small>{nacoes?.whatsapp}</small></span>
        </a>
      </li>
    </ul>
  );
}
