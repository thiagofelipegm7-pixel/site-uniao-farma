import type { DailyHours, Unit } from "./site-config";

export type DayRule =
  | { type: "closed"; name: string }
  | { type: "special"; name: string; open: string; close: string };

export const NATIONAL_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "Confraternização Universal",
  "2026-02-16": "Carnaval",
  "2026-02-17": "Carnaval",
  "2026-04-03": "Paixão de Cristo",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalho",
  "2026-06-04": "Corpus Christi",
  "2026-09-07": "Independência do Brasil",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclamação da República",
  "2026-11-20": "Consciência Negra",
  "2026-12-25": "Natal",
  "2027-01-01": "Confraternização Universal",
  "2027-02-08": "Carnaval",
  "2027-02-09": "Carnaval",
  "2027-03-26": "Paixão de Cristo",
  "2027-04-21": "Tiradentes",
  "2027-05-01": "Dia do Trabalho",
  "2027-05-27": "Corpus Christi",
  "2027-09-07": "Independência do Brasil",
  "2027-10-12": "Nossa Senhora Aparecida",
  "2027-11-02": "Finados",
  "2027-11-15": "Proclamação da República",
  "2027-11-20": "Consciência Negra",
  "2027-12-25": "Natal",
};

const eveFatima: DayRule = { type: "special", name: "Véspera", open: "07:00", close: "12:00" };
const eveEight: DayRule = { type: "special", name: "Véspera", open: "08:00", close: "12:00" };

export const SPECIAL_DATES: Record<string, DayRule> = {
  "2026-12-24": eveFatima,
  "2026-12-31": eveFatima,
  "2027-12-24": eveFatima,
  "2027-12-31": eveFatima,
};

export const UNIT_DAY_OVERRIDES: Partial<Record<Unit["id"], Record<string, DayRule>>> = {
  nacoes: {
    "2026-12-24": eveEight,
    "2026-12-31": eveEight,
    "2027-12-24": eveEight,
    "2027-12-31": eveEight,
  },
  itacolomi: {
    "2026-12-24": eveEight,
    "2026-12-31": eveEight,
    "2027-12-24": eveEight,
    "2027-12-31": eveEight,
  },
};

export function getSaoPauloDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addSaoPauloDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + days);
  const next = new Date(utc);
  const yearText = String(next.getUTCFullYear());
  const monthText = String(next.getUTCMonth() + 1).padStart(2, "0");
  const dayText = String(next.getUTCDate()).padStart(2, "0");
  return `${yearText}-${monthText}-${dayText}`;
}

export function getHolidayName(date: Date): string | null {
  return NATIONAL_HOLIDAYS[getSaoPauloDateKey(date)] ?? null;
}

export function getDayRule(dateKey: string, unitId?: Unit["id"]): DayRule | null {
  if (unitId && UNIT_DAY_OVERRIDES[unitId]?.[dateKey]) {
    return UNIT_DAY_OVERRIDES[unitId][dateKey];
  }
  if (SPECIAL_DATES[dateKey]) return SPECIAL_DATES[dateKey];
  const holiday = NATIONAL_HOLIDAYS[dateKey];
  if (holiday) return { type: "closed", name: holiday };
  return null;
}

export function getHoursForDate(unit: Unit, dateKey: string, weekdayHours: DailyHours): DailyHours | DayRule {
  const rule = getDayRule(dateKey, unit.id);
  if (rule) return rule;
  return weekdayHours;
}
