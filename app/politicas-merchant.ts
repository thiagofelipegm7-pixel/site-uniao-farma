import { SITE_URL } from "./site-config";

/**
 * Entrega e troca informadas pelo dono (nov/2026) para o Google Merchant.
 * Só entram na Organization e nas ofertas de item que não é medicamento
 * (elegivelGoogle). Campos incertos, como taxa de devolução, ficam de fora.
 */

export const TAXA_ENTREGA_BRL = "5.00";
export const PRAZO_DEVOLUCAO_DIAS = 7;
export const URL_TROCAS = `${SITE_URL}/trocas-e-devolucoes`;
export const ID_POLITICA_DEVOLUCAO = `${URL_TROCAS}#politica`;
export const ID_SERVICO_ENTREGA = `${SITE_URL}/#entrega-local`;

const destinoEntrega = {
  "@type": "DefinedRegion",
  addressCountry: "BR",
  addressRegion: "MG",
} as const;

const prazoMesmoDia = {
  "@type": "QuantitativeValue",
  minValue: 0,
  maxValue: 0,
  unitCode: "DAY",
} as const;

/** OfferShippingDetails: vai em Offer.shippingDetails (ficha de produto no Google). */
export const detalhesEntregaOferta = {
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: TAXA_ENTREGA_BRL,
    currency: "BRL",
  },
  shippingDestination: destinoEntrega,
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: prazoMesmoDia,
    transitTime: prazoMesmoDia,
  },
} as const;

/**
 * ShippingService: vai em Organization.hasShippingService (política padrão da loja).
 * Os campos equivalentes da oferta ficam em detalhesEntregaOferta.
 */
export const servicoEntregaOrganizacao = {
  "@type": "ShippingService",
  "@id": ID_SERVICO_ENTREGA,
  name: "Entrega local em Sabará",
  description: "Entrega com taxa fixa de R$ 5,00, em até 1 hora, na área local de Sabará/MG.",
  fulfillmentType: "https://schema.org/FulfillmentTypeDelivery",
  handlingTime: {
    "@type": "ServicePeriod",
    duration: prazoMesmoDia,
  },
  shippingConditions: {
    "@type": "ShippingConditions",
    shippingDestination: destinoEntrega,
    shippingRate: {
      "@type": "MonetaryAmount",
      value: TAXA_ENTREGA_BRL,
      currency: "BRL",
    },
    transitTime: {
      "@type": "ServicePeriod",
      duration: prazoMesmoDia,
    },
  },
} as const;

/** MerchantReturnPolicy: produto que não é remédio, lacrado, em até 7 dias, retirada na loja. */
export const politicaDevolucao = {
  "@type": "MerchantReturnPolicy",
  "@id": ID_POLITICA_DEVOLUCAO,
  applicableCountry: "BR",
  returnPolicyCountry: "BR",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: PRAZO_DEVOLUCAO_DIAS,
  returnMethod: "https://schema.org/ReturnInStore",
  itemCondition: "https://schema.org/NewCondition",
  merchantReturnLink: URL_TROCAS,
} as const;

/** Bloco g:shipping do feed do Merchant Center (mesmo valor e prazo da oferta). */
export const XML_ENTREGA_FEED = [
  "      <g:shipping>",
  "        <g:country>BR</g:country>",
  "        <g:region>MG</g:region>",
  "        <g:service>Entrega local em Sabará</g:service>",
  `        <g:price>${TAXA_ENTREGA_BRL} BRL</g:price>`,
  "      </g:shipping>",
  "      <g:min_handling_time>0</g:min_handling_time>",
  "      <g:max_handling_time>0</g:max_handling_time>",
  "      <g:min_transit_time>0</g:min_transit_time>",
  "      <g:max_transit_time>0</g:max_transit_time>",
].join("\n");
