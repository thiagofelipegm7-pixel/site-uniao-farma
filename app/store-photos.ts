export type StorePhoto = {
  src: string;
  alt: string;
  unit: string;
  kind: "Fachada" | "Interior" | "Produto";
  caption: string;
};

const V = "v=23";

export const STORE_PHOTOS: StorePhoto[] = [
  {
    src: `/uniao-farma-fatima-interior.svg?${V}`,
    alt: "Interior da Uni\u00e3o Farma F\u00e1tima \u2014 balc\u00e3o, g\u00f4ndolas e atendimento em Sabar\u00e1",
    unit: "F\u00e1tima",
    kind: "Interior",
    caption: "Interior \u00b7 F\u00e1tima",
  },
  {
    src: `/uniao-farma-nacoes-loja.webp?${V}`,
    alt: "Fachada da Uni\u00e3o Farma Na\u00e7\u00f5es Unidas, em Sabar\u00e1",
    unit: "Na\u00e7\u00f5es Unidas",
    kind: "Fachada",
    caption: "Fachada \u00b7 Na\u00e7\u00f5es Unidas",
  },
  {
    src: `/uniao-farma-perfumaria.webp?${V}`,
    alt: "G\u00f4ndola de cabelos e perfumaria na Uni\u00e3o Farma F\u00e1tima",
    unit: "F\u00e1tima",
    kind: "Interior",
    caption: "G\u00f4ndola \u00b7 F\u00e1tima",
  },
  {
    src: `/uniao-farma-medicamentos.webp?${V}`,
    alt: "Interior da Uni\u00e3o Farma Itacolomi \u2014 prateleira de medicamentos",
    unit: "Itacolomi",
    kind: "Interior",
    caption: "Interior \u00b7 Itacolomi",
  },
  {
    src: `/promotions/drafts/seda-creme-pentear-original.jpeg?${V}`,
    alt: "Creme Seda para pentear em oferta na Uni\u00e3o Farma",
    unit: "Oferta da semana",
    kind: "Produto",
    caption: "Produto \u00b7 Seda",
  },
  {
    src: `/promotions/drafts/nivea-locao-original.jpeg?${V}`,
    alt: "Lo\u00e7\u00e3o hidratante Nivea em oferta na Uni\u00e3o Farma",
    unit: "Oferta da semana",
    kind: "Produto",
    caption: "Produto \u00b7 Nivea",
  },
  {
    src: `/promotions/drafts/sundown-original.jpeg?${V}`,
    alt: "Protetor solar Sundown em oferta na Uni\u00e3o Farma",
    unit: "Oferta da semana",
    kind: "Produto",
    caption: "Produto \u00b7 Sundown",
  },
];
