import { GOOGLE_REVIEWS_URL, UNITS, type Unit } from "./site-config";

export type UnitGoogleProfile = {
  unitId: Unit["id"];
  label: string;
  mapsUrl: string;
  rating: number | null;
  reviewCount: number | null;
  sourceNote: string;
};

/**
 * Notas e quantidades das 3 lojas no Google, confirmadas pelo respons\u00e1vel em 02/11/2026.
 * Atualize aqui quando o perfil mudar; a home mostra exatamente estes valores.
 */
export const UNIT_GOOGLE_PROFILES: UnitGoogleProfile[] = [
  {
    unitId: "fatima",
    label: "F\u00e1tima",
    mapsUrl: UNITS[0].map,
    rating: 4.6,
    reviewCount: 20,
    sourceNote: "Perfil no Google Maps desta unidade",
  },
  {
    unitId: "nacoes",
    label: "Na\u00e7\u00f5es Unidas",
    mapsUrl: GOOGLE_REVIEWS_URL,
    rating: 4.8,
    reviewCount: 30,
    sourceNote: "Nota do perfil de Na\u00e7\u00f5es Unidas no Google",
  },
  {
    unitId: "itacolomi",
    label: "Itacolomi",
    mapsUrl: UNITS[2].map,
    rating: 4.6,
    reviewCount: 12,
    sourceNote: "Perfil no Google Maps desta unidade",
  },
];
