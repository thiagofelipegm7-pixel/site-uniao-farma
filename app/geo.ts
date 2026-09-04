import { UNITS, type Unit } from "./site-config";

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type RankedUnit = {
  unit: Unit;
  distanceKm: number;
};

const EARTH_RADIUS_KM = 6371;
const FAR_FROM_SABARA_KM = 35;

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceKm(from: GeoPoint, to: GeoPoint) {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number) {
  if (km < 1) {
    return `${Math.max(50, Math.round(km * 1000))} m`;
  }

  return `${km.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function rankUnitsByDistance(origin: GeoPoint): RankedUnit[] {
  return UNITS.filter((unit) => unit.coordinates)
    .map((unit) => ({
      unit,
      distanceKm: distanceKm(origin, unit.coordinates as GeoPoint),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function isFarFromCoverage(km: number) {
  return km > FAR_FROM_SABARA_KM;
}
