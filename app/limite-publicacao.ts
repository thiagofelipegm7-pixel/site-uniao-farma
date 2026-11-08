/** Limite de frequência das publicações pedidas ao GitHub (módulo puro: testável sem o runtime do Cloudflare). */
export type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown>; first<T>(): Promise<T | null> } };
};

/** Mínimo entre duas publicações pedidas ao GitHub: cada execução gasta minutos grátis do mês, e fotos em sequência vão juntas no mesmo lote. */
export const MINUTOS_ENTRE_PUBLICACOES = 10;

/** Pode pedir outra publicação agora? Se sim, já marca a hora. */
export async function reservarPublicacao(db: Banco | null, agora = Date.now()): Promise<boolean> {
  if (!db) return true;
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS disparo_sync (id INTEGER PRIMARY KEY CHECK (id = 1), quando INTEGER NOT NULL)");
    const ultimo = await db.prepare("SELECT quando FROM disparo_sync WHERE id = 1").bind().first<{ quando: number }>();
    if (ultimo && agora - ultimo.quando < MINUTOS_ENTRE_PUBLICACOES * 60_000) return false;
    await db.prepare("INSERT OR REPLACE INTO disparo_sync (id, quando) VALUES (1, ?)").bind(agora).run();
    return true;
  } catch {
    return true;
  }
}

const REPO = "thiagofelipegm7-pixel/site-uniao-farma";
const WORKFLOW = "catalogo-sync.yml";

