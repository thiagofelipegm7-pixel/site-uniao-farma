import { UNITS, type Unit } from "./site-config";

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type RankedUnit = {
  unit: Unit;
  distanceKm: number;
};

export type CachedOrigin = GeoPoint & {
  savedAt: number;
  accuracy?: number;
};

const EARTH_RADIUS_KM = 6371;
const FAR_FROM_SABARA_KM = 35;
const CACHE_KEY = "uf:geo:v1";
const FRESH_TTL_MS = 45 * 60 * 1000;
const MAX_TTL_MS = 6 * 60 * 60 * 1000;

let memoryCache: CachedOrigin | null = null;
const distanceCache = new Map<string, number>();

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function roundCoord(value: number) {
  return Math.round(value * 10000) / 10000;
}

function cacheKey(from: GeoPoint, to: GeoPoint) {
  return `${roundCoord(from.latitude)},${roundCoord(from.longitude)}:${roundCoord(to.latitude)},${roundCoord(to.longitude)}`;
}

export function distanceKm(from: GeoPoint, to: GeoPoint) {
  const key = cacheKey(from, to);
  const cached = distanceCache.get(key);
  if (cached !== undefined) return cached;

  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));

  if (distanceCache.size > 200) distanceCache.clear();
  distanceCache.set(key, km);
  return km;
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

export function isFreshCache(savedAt: number, now = Date.now()) {
  return now - savedAt < FRESH_TTL_MS;
}

export function readCachedOrigin(): CachedOrigin | null {
  if (memoryCache && Date.now() - memoryCache.savedAt < MAX_TTL_MS) {
    return memoryCache;
  }

  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedOrigin;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt >= MAX_TTL_MS
    ) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }

    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedOrigin(origin: GeoPoint, accuracy?: number) {
  const cached: CachedOrigin = {
    latitude: roundCoord(origin.latitude),
    longitude: roundCoord(origin.longitude),
    accuracy,
    savedAt: Date.now(),
  };

  memoryCache = cached;

  if (typeof window === "undefined") return cached;

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // Private mode or full storage should not break the locator.
  }

  return cached;
}

export function clearCachedOrigin() {
  memoryCache = null;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
