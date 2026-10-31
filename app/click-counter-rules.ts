/**
 * Regras do contador próprio de cliques (sem cookies, sem IP, sem user agent, sem ID).
 * Arquivo sem dependência de Cloudflare para poder ser testado no Node.
 */
export const CLICK_BUTTONS = ["whatsapp", "ifood"] as const;
export type ClickButton = (typeof CLICK_BUTTONS)[number];

export const CLICK_STORES = ["fatima", "nacoes_unidas", "itacolomi", "geral"] as const;
export type ClickStore = (typeof CLICK_STORES)[number];

export type ClickInput = { path: string; button: ClickButton; store: ClickStore };

export const CLICK_MAX_BODY_BYTES = 1024;
export const CLICK_PANEL_DAYS = 30;

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp\/|curl|wget|python-requests|go-http-client|node-fetch|axios|monitor|uptime|phantom|selenium|puppeteer|playwright/i;

/** Bot óbvio pelo user agent. O UA só é lido para decidir, nunca é guardado. */
export function isObviousBot(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? "").trim();
  return !ua || BOT_PATTERN.test(ua);
}

const PATH_SHAPE = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;
const BLOCKED_PREFIXES = ["/api", "/interno", "/painel-cliques"];

/** Aceita só caminhos de páginas públicas conhecidas (evita lixo e crescimento da tabela). */
export function cleanClickPath(value: unknown, allowedPaths: ReadonlySet<string>): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  const normalized = trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  if (normalized.length > 80 || !PATH_SHAPE.test(normalized)) return null;
  if (BLOCKED_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) return null;
  return allowedPaths.has(normalized) ? normalized : null;
}

/** Valida o corpo. Só `path`, `button` e `store` entram. Qualquer outro campo é descartado. */
export function parseClickBody(body: unknown, allowedPaths: ReadonlySet<string>): ClickInput | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const button = CLICK_BUTTONS.find((item) => item === raw.button);
  const path = cleanClickPath(raw.path, allowedPaths);
  if (!button || !path) return null;
  const store = CLICK_STORES.find((item) => item === raw.store) ?? "geral";
  return { path, button, store };
}

export type ClickRow = { day: string; path: string; button: string; store: string; count: number };

export type ClickReport = {
  days: Array<{ day: string; whatsapp: number; ifood: number; total: number }>;
  byStore: Array<{ store: string; whatsapp: number; ifood: number; total: number }>;
  byButton: Array<{ button: string; total: number }>;
  byPath: Array<{ path: string; whatsapp: number; ifood: number; total: number }>;
  total: number;
};

/** Datas YYYY-MM-DD dos últimos `count` dias, do mais novo para o mais antigo. */
export function lastDays(today: string, count: number): string[] {
  const base = new Date(`${today}T12:00:00Z`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base.getTime() - index * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

export function buildClickReport(rows: ClickRow[], today: string, dayCount = CLICK_PANEL_DAYS): ClickReport {
  const dayList = lastDays(today, dayCount);
  const inRange = new Set(dayList);
  const days = new Map(dayList.map((day) => [day, { day, whatsapp: 0, ifood: 0, total: 0 }]));
  const byStore = new Map<string, { store: string; whatsapp: number; ifood: number; total: number }>(
    CLICK_STORES.map((store) => [store, { store, whatsapp: 0, ifood: 0, total: 0 }]),
  );
  const byPath = new Map<string, { path: string; whatsapp: number; ifood: number; total: number }>();
  const byButton = new Map<string, number>(CLICK_BUTTONS.map((button) => [button, 0]));
  let total = 0;

  for (const row of rows) {
    if (!inRange.has(row.day)) continue;
    const count = Number(row.count) || 0;
    const isIfood = row.button === "ifood";
    const key = isIfood ? "ifood" : "whatsapp";
    const day = days.get(row.day)!;
    day[key] += count;
    day.total += count;
    const store = byStore.get(row.store) ?? { store: row.store, whatsapp: 0, ifood: 0, total: 0 };
    store[key] += count;
    store.total += count;
    byStore.set(row.store, store);
    const page = byPath.get(row.path) ?? { path: row.path, whatsapp: 0, ifood: 0, total: 0 };
    page[key] += count;
    page.total += count;
    byPath.set(row.path, page);
    byButton.set(key, (byButton.get(key) ?? 0) + count);
    total += count;
  }

  return {
    days: dayList.map((day) => days.get(day)!),
    byStore: [...byStore.values()],
    byButton: [...byButton].map(([button, sum]) => ({ button, total: sum })),
    byPath: [...byPath.values()].sort((a, b) => b.total - a.total).slice(0, 15),
    total,
  };
}
