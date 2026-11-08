import { dispararSincronizacao } from "../../disparar-sync";
import { banco, segredo } from "../../estoque-fonte";
import { listarPendentes, listarRemocoes } from "../../fotos-enviadas";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Chamada pela tarefa agendada do Worker (a cada 30 min): se há fotos esperando para virar arquivo fixo, pede a publicação ao GitHub (no máximo uma a cada 10 min). */
export async function POST(request: Request) {
  const token = segredo("CATALOGO_READ_TOKEN");
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !enviado || !iguais(token, enviado)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const esperando = (await listarPendentes(db).catch(() => [])).length + (await listarRemocoes(db).catch(() => [])).length;
  if (esperando === 0) return Response.json({ ok: true, esperando: 0, publicando: false }, { headers: SEM_CACHE });
  return Response.json({ ok: true, esperando, publicando: await dispararSincronizacao(db) }, { headers: SEM_CACHE });
}
