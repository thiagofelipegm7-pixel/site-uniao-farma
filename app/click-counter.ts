import { env } from "cloudflare:workers";
import sitemap from "./sitemap";
import { todayKey } from "./metrics-store";
import {
  buildClickReport,
  CLICK_PANEL_DAYS,
  lastDays,
  type ClickInput,
  type ClickReport,
  type ClickRow,
} from "./click-counter-rules";
import { SITE_URL } from "./site-config";

/**
 * Contador próprio de cliques em WhatsApp e iFood.
 * Guarda só contagens agregadas por dia, página, botão e loja no D1 (binding DB).
 * Não guarda IP, user agent, cookie nem identificador de pessoa.
 */
type D1Result = { results?: unknown[] };
type D1Statement = { bind(...values: unknown[]): D1Statement; run(): Promise<D1Result>; all(): Promise<D1Result> };
type ClickDb = { prepare(query: string): D1Statement; exec?(query: string): Promise<unknown> };

const CREATE_TABLE =
  "CREATE TABLE IF NOT EXISTS click_counts (day TEXT NOT NULL, path TEXT NOT NULL, button TEXT NOT NULL, store TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, path, button, store))";

const globalClicks = globalThis as typeof globalThis & {
  __ufClickMemory?: Map<string, ClickRow>;
  __ufClickTableReady?: boolean;
};

function database(): ClickDb | undefined {
  try {
    return (env as { DB?: ClickDb }).DB;
  } catch {
    return undefined;
  }
}

async function ensureTable(db: ClickDb) {
  if (globalClicks.__ufClickTableReady) return;
  await db.prepare(CREATE_TABLE).run();
  globalClicks.__ufClickTableReady = true;
}

function memory() {
  if (!globalClicks.__ufClickMemory) globalClicks.__ufClickMemory = new Map();
  return globalClicks.__ufClickMemory;
}

let allowedPaths: Set<string> | undefined;

/** Caminhos das páginas públicas, a partir do sitemap. */
export function getAllowedClickPaths(): Set<string> {
  if (!allowedPaths) {
    allowedPaths = new Set(
      sitemap().map((entry) => {
        const path = entry.url.replace(SITE_URL, "") || "/";
        return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
      }),
    );
    allowedPaths.add("/");
  }
  return allowedPaths;
}

export async function recordClick(input: ClickInput): Promise<void> {
  const day = todayKey();
  const db = database();
  if (db) {
    await ensureTable(db);
    await db
      .prepare(
        "INSERT INTO click_counts (day, path, button, store, count) VALUES (?, ?, ?, ?, 1) ON CONFLICT (day, path, button, store) DO UPDATE SET count = count + 1",
      )
      .bind(day, input.path, input.button, input.store)
      .run();
    return;
  }
  // Sem D1 (desenvolvimento local): contagem em memória do processo.
  const key = `${day}|${input.path}|${input.button}|${input.store}`;
  const row = memory().get(key) ?? { day, path: input.path, button: input.button, store: input.store, count: 0 };
  row.count += 1;
  memory().set(key, row);
}

export async function getClickReport(): Promise<ClickReport & { storage: "d1" | "memoria" }> {
  const today = todayKey();
  const oldest = lastDays(today, CLICK_PANEL_DAYS).at(-1)!;
  const db = database();
  if (db) {
    await ensureTable(db);
    const result = await db
      .prepare("SELECT day, path, button, store, count FROM click_counts WHERE day >= ?")
      .bind(oldest)
      .all();
    return { ...buildClickReport((result.results ?? []) as ClickRow[], today), storage: "d1" };
  }
  return { ...buildClickReport([...memory().values()], today), storage: "memoria" };
}
