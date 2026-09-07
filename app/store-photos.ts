export type StorePhoto = {
  src: string;
  alt: string;
  unit: string;
  kind: "Fachada" | "Interior" | "Gôndola";
  caption: string;
};

const V = "v=21";

export const STORE_PHOTOS: StorePhoto[] = [
  {
    src: `/uniao-farma-nacoes-loja.webp?${V}`,
    alt: "Fachada da União Farma Nações Unidas, em Sabará",
    unit: "Nações Unidas",
    kind: "Fachada",
    caption: "Fachada · Nações Unidas",
  },
  {
    src: `/uniao-farma-perfumaria.webp?${V}`,
    alt: "Interior da União Farma Fátima — gôndola de cabelos e perfumaria",
    unit: "Fátima",
    kind: "Interior",
    caption: "Interior · Fátima",
  },
  {
    src: `/uniao-farma-medicamentos.webp?${V}`,
    alt: "Interior da União Farma Itacolomi — prateleira de medicamentos",
    unit: "Itacolomi",
    kind: "Interior",
    caption: "Interior · Itacolomi",
  },
  {
    src: `/loja-bio-extratus.svg?${V}`,
    alt: "Linha Bio Extratus na gôndola da União Farma",
    unit: "Nas três lojas",
    kind: "Gôndola",
    caption: "Gôndola · Bio Extratus",
  },
  {
    src: `/loja-salon-line-cremes.svg?${V}`,
    alt: "Cremes Salon Line na prateleira da União Farma",
    unit: "Nas três lojas",
    kind: "Gôndola",
    caption: "Gôndola · Salon Line",
  },
  {
    src: `/loja-rexona-clinical.svg?${V}`,
    alt: "Rexona Clinical na União Farma",
    unit: "Nas três lojas",
    kind: "Gôndola",
    caption: "Gôndola · Rexona",
  },
  {
    src: `/loja-dove-oleo-serum.svg?${V}`,
    alt: "Óleo sérum Dove na União Farma",
    unit: "Nas três lojas",
    kind: "Gôndola",
    caption: "Gôndola · Dove",
  },
  {
    src: `/loja-salon-line-matizadora.svg?${V}`,
    alt: "Máscaras matizadoras Salon Line na União Farma",
    unit: "Nas três lojas",
    kind: "Gôndola",
    caption: "Gôndola · Matizadora",
  },
  {
    src: `/loja-dove-banho.svg?${V}`,
    alt: "Linha Dove banho na União Farma",
    unit: "Nas três lojas",
    kind: "Gôndola",
    caption: "Gôndola · Dove banho",
  },
];
