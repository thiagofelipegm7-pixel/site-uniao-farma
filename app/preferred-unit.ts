import { UNITS, type Unit } from "./site-config";

const STORAGE_KEY = "uf:preferred-unit:v1";
const VALID_IDS = new Set(UNITS.map((unit) => unit.id));

export function readPreferredUnitId(): Unit["id"] | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value || !VALID_IDS.has(value as Unit["id"])) return null;
    return value as Unit["id"];
  } catch {
    return null;
  }
}

export function writePreferredUnitId(id: Unit["id"]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("uf-preferred-unit", { detail: id }));
  } catch {
    // ignore quota / private mode
  }
}

export function sortUnitsByPreference(units: Unit[], preferredId: Unit["id"] | null) {
  if (!preferredId) return units;
  return [...units].sort((a, b) => Number(b.id === preferredId) - Number(a.id === preferredId));
}
