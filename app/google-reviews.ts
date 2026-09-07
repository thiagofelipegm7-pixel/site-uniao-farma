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
 * Only Na\u00e7\u00f5es Unidas has a confirmed Google profile URL in the project.
 * Ratings for the other units stay empty until someone checks the live profile.
 */
export const UNIT_GOOGLE_PROFILES: UnitGoogleProfile[] = [
  {
    unitId: "fatima",
    label: "F\u00e1tima",
    mapsUrl: UNITS[0].map,
    rating: null,
    reviewCount: null,
    sourceNote: "Perfil no Google Maps desta unidade",
  },
  {
    unitId: "nacoes",
    label: "Na\u00e7\u00f5es Unidas",
    mapsUrl: GOOGLE_REVIEWS_URL,
    rating: 4.7,
    reviewCount: null,
    sourceNote: "Nota do perfil de Na\u00e7\u00f5es Unidas no Google",
  },
  {
    unitId: "itacolomi",
    label: "Itacolomi",
    mapsUrl: UNITS[2].map,
    rating: null,
    reviewCount: null,
    sourceNote: "Perfil no Google Maps desta unidade",
  },
];
