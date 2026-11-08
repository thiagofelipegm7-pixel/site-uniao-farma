import { segredo } from "./estoque-fonte";

type Banco = {
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

/**
 * Pede ao GitHub para rodar já a sincronização (que publica as fotos enviadas pelo painel), em vez de esperar o horário dela.
 * Precisa do segredo GITHUB_DISPATCH_TOKEN (o mesmo do botão "Forçar atualização"). Sem ele ou se o GitHub recusar, devolve false:
 * a foto continua guardada e vale na próxima sincronização. Várias fotos seguidas viram, no máximo, uma execução esperando na fila.
 */
export async function dispararSincronizacao(db: Banco | null = null): Promise<boolean> {
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return false;
  // Dentro da janela, a foto espera o próximo lote (cron de 30 em 30 min); a execução que já saiu ou vai sair leva as que chegarem antes.
  if (!(await reservarPublicacao(db))) return false;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "user-agent": "uniao-farma-painel",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(6000),
    });
    return r.status === 204;
  } catch {
    return false;
  }
}
