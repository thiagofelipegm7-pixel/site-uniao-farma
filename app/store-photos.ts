export type StorePhoto = {
  src: string;
  alt: string;
  unit: string;
  kind: "Fachada" | "Interior" | "Produto";
  caption: string;
};

const V = "v=26";

export const STORE_PHOTOS: StorePhoto[] = [
  {
    src: `/fotos/fatima-interior.jpg?${V}`,
    alt: "Interior da União Farma Fátima — balcão, gôndolas e atendimento em Sabará",
    unit: "Fátima",
    kind: "Interior",
    caption: "Interior · Fátima",
  },
  {
    src: `/uniao-farma-nacoes-loja.webp?${V}`,
    alt: "Fachada da União Farma Nações Unidas, em Sabará",
    unit: "Nações Unidas",
    kind: "Fachada",
    caption: "Fachada · Nações Unidas",
  },
  {
    src: `/uniao-farma-perfumaria.webp?${V}`,
    alt: "Gôndola de cabelos e perfumaria na União Farma Fátima",
    unit: "Fátima",
    kind: "Interior",
    caption: "Gôndola · Fátima",
  },
  {
    src: `/uniao-farma-medicamentos.webp?${V}`,
    alt: "Interior da União Farma Itacolomi — prateleira de medicamentos",
    unit: "Itacolomi",
    kind: "Interior",
    caption: "Interior · Itacolomi",
  },
  {
    src: `/promotions/drafts/seda-creme-pentear-original.jpeg?${V}`,
    alt: "Creme Seda para pentear em oferta na União Farma",
    unit: "Oferta da semana",
    kind: "Produto",
    caption: "Produto · Seda",
  },
  {
    src: `/promotions/drafts/nivea-locao-original.jpeg?${V}`,
    alt: "Loção hidratante Nivea em oferta na União Farma",
    unit: "Oferta da semana",
    kind: "Produto",
    caption: "Produto · Nivea",
  },
  {
    src: `/promotions/drafts/sundown-original.jpeg?${V}`,
    alt: "Protetor solar Sundown em oferta na União Farma",
    unit: "Oferta da semana",
    kind: "Produto",
    caption: "Produto · Sundown",
  },
];
