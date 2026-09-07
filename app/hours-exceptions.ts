/** National holidays that must not use weekday opening hours. */
export const NATIONAL_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "Confraterniza\u00e7\u00e3o Universal",
  "2026-02-16": "Carnaval",
  "2026-02-17": "Carnaval",
  "2026-04-03": "Paix\u00e3o de Cristo",
  "2026-04-21": "Tiradentes",
  "2026-05-01": "Dia do Trabalho",
  "2026-06-04": "Corpus Christi",
  "2026-09-07": "Independ\u00eancia do Brasil",
  "2026-10-12": "Nossa Senhora Aparecida",
  "2026-11-02": "Finados",
  "2026-11-15": "Proclama\u00e7\u00e3o da Rep\u00fablica",
  "2026-11-20": "Consci\u00eancia Negra",
  "2026-12-25": "Natal",
};

export function getSaoPauloDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getHolidayName(date: Date): string | null {
  return NATIONAL_HOLIDAYS[getSaoPauloDateKey(date)] ?? null;
}
