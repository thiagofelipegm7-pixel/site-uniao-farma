import { banco, lerEstoqueAtual, segredo } from "../../estoque-fonte";
import { salvarSnapshot } from "../../estoque-historico";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Guarda o estoque do dia. Chamada pela tarefa agendada do Worker (cron), com o mesmo token de leitura do catálogo. */
export async function POST(request: Request) {
  const token = segredo("CATALOGO_READ_TOKEN");
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !enviado || !iguais(token, enviado)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const atual = await lerEstoqueAtual();
  if (!atual) return Response.json({ ok: false, erro: "sem_dados" }, { status: 502, headers: SEM_CACHE });
  const gravados = await salvarSnapshot(db, atual.dia, atual.itens);
  return Response.json({ ok: true, dia: atual.dia, itens: gravados }, { headers: SEM_CACHE });
}
