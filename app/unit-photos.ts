import type { Unit } from "./site-config";

export const UNIT_PHOTOS: Record<Unit["id"], string> = {
  fatima: "/uniao-farma-perfumaria.webp",
  nacoes: "/uniao-farma-nacoes-loja.webp",
  itacolomi: "/uniao-farma-medicamentos.webp",
};

export const UNIT_PHOTO_KIND: Record<Unit["id"], "Fachada" | "Interior"> = {
  fatima: "Interior",
  nacoes: "Fachada",
  itacolomi: "Interior",
};
