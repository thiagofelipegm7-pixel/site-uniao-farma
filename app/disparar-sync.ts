import { segredo } from "./estoque-fonte";
import { reservarPublicacao, type Banco } from "./limite-publicacao";

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
