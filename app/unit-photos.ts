import type { Unit } from "./site-config";

const V = "v=27";

export const UNIT_PHOTOS: Record<Unit["id"], string> = {
  fatima: `/uniao-farma-perfumaria.webp?${V}`,
  nacoes: `/uniao-farma-nacoes-loja.webp?${V}`,
  itacolomi: `/uniao-farma-medicamentos.webp?${V}`,
};

export const UNIT_PHOTO_KIND: Record<Unit["id"], "Fachada" | "Interior"> = {
  fatima: "Interior",
  nacoes: "Fachada",
  itacolomi: "Interior",
};
