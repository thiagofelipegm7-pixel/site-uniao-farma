import type { Unit } from "./site-config";
import { FATIMA_INTERIOR_SRC } from "./fatima-interior-src";

export const UNIT_PHOTOS: Record<Unit["id"], string> = {
  fatima: FATIMA_INTERIOR_SRC,
  nacoes: "/uniao-farma-nacoes-loja.webp",
  itacolomi: "/uniao-farma-medicamentos.webp",
};

export const UNIT_PHOTO_KIND: Record<Unit["id"], "Fachada" | "Interior"> = {
  fatima: "Interior",
  nacoes: "Fachada",
  itacolomi: "Interior",
};
