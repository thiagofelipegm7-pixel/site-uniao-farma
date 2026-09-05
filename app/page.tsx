"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep the Novidades route working in Vinext production. */

import { useEffect, useRef, useState } from "react";
import UnitStatusBadge from "./UnitStatusBadge";
import DirectUnitLinks from "./DirectUnitLinks";
import { trackEvent } from "./analytics";
import {
  buildWhatsAppUrl,
  GOOGLE_REVIEWS_URL,
  INSTAGRAM_URL,
  SITE_OPTIONS,
  SITE_URL,
  UNITS,
} from "./site-config";
import { HOME_FAQS } from "./seo-content";
import { getPageStructuredData } from "./structured-data";
import { formatOfferPrice, getPublicOffers } from "./offers";

type SelectorIntent = {
  title: string;
  description: string;
  message: string;
  eventName: string;
};

const deliveryIntent: SelectorIntent = {
  title: "Consultar entrega",
  description: "Escolha a unidade mais próxima para verificar o atendimento no seu bairro.",
  message:
    "Olá! Vim pelo site da União Farma e gostaria de saber se vocês entregam no meu bairro. Posso informar meu endereço?",
  eventName: "delivery_inquiry",
};

const SHORT_UNIT_ADDRESSES = {
  fatima: "Rua Cláudio, 902 · Fátima",
  nacoes: "Rua Inglaterra, 162 · Nações Unidas",
  itacolomi: "Rua Joaquim F. Moreira, 489 · Itacolomi",
} as const;
