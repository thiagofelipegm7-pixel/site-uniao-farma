export type StorePhoto = {
  src: string;
  alt: string;
  unit: string;
  kind: "Fachada" | "Interior" | "G\u00f4ndola";
  caption: string;
};

export const STORE_PHOTOS: StorePhoto[] = [
  {
    src: "/uniao-farma-nacoes-loja.webp",
    alt: "Fachada da Uni\u00e3o Farma Na\u00e7\u00f5es Unidas, em Sabar\u00e1",
    unit: "Na\u00e7\u00f5es Unidas",
    kind: "Fachada",
    caption: "Fachada \u00b7 Na\u00e7\u00f5es Unidas",
  },
  {
    src: "/uniao-farma-perfumaria.webp",
    alt: "Interior da Uni\u00e3o Farma F\u00e1tima \u2014 g\u00f4ndola de cabelos e perfumaria",
    unit: "F\u00e1tima",
    kind: "Interior",
    caption: "Interior \u00b7 F\u00e1tima",
  },
  {
    src: "/uniao-farma-medicamentos.webp",
    alt: "Interior da Uni\u00e3o Farma Itacolomi \u2014 prateleira de medicamentos",
    unit: "Itacolomi",
    kind: "Interior",
    caption: "Interior \u00b7 Itacolomi",
  },
  {
    src: "/loja-bio-extratus.svg?v=18",
    alt: "Linha Bio Extratus na g\u00f4ndola da Uni\u00e3o Farma",
    unit: "Nas tr\u00eas lojas",
    kind: "G\u00f4ndola",
    caption: "G\u00f4ndola \u00b7 Bio Extratus",
  },
  {
    src: "/loja-salon-line-cremes.svg?v=18",
    alt: "Cremes Salon Line na prateleira da Uni\u00e3o Farma",
    unit: "Nas tr\u00eas lojas",
    kind: "G\u00f4ndola",
    caption: "G\u00f4ndola \u00b7 Salon Line",
  },
  {
    src: "/loja-rexona-clinical.svg?v=18",
    alt: "Rexona Clinical na Uni\u00e3o Farma",
    unit: "Nas tr\u00eas lojas",
    kind: "G\u00f4ndola",
    caption: "G\u00f4ndola \u00b7 Rexona",
  },
  {
    src: "/loja-dove-oleo-serum.svg?v=18",
    alt: "\u00d3leo s\u00e9rum Dove na Uni\u00e3o Farma",
    unit: "Nas tr\u00eas lojas",
    kind: "G\u00f4ndola",
    caption: "G\u00f4ndola \u00b7 Dove",
  },
  {
    src: "/loja-salon-line-matizadora.svg?v=18",
    alt: "M\u00e1scaras matizadoras Salon Line na Uni\u00e3o Farma",
    unit: "Nas tr\u00eas lojas",
    kind: "G\u00f4ndola",
    caption: "G\u00f4ndola \u00b7 Matizadora",
  },
  {
    src: "/loja-dove-banho.svg?v=18",
    alt: "Linha Dove banho na Uni\u00e3o Farma",
    unit: "Nas tr\u00eas lojas",
    kind: "G\u00f4ndola",
    caption: "G\u00f4ndola \u00b7 Dove banho",
  },
];
