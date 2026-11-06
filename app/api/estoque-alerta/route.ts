import { avaliarPc, decidirAviso, textoDoAviso, type EstadoAlerta } from "../../estoque-pc";
import { banco, enviarPush, lerBatimentoPc, segredo } from "../../estoque-fonte";
import { PUBLIC_UNITS } from "../../site-config";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i += 1) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): { bind(...v: unknown[]): { run(): Promise<unknown>; first<T>(): Promise<T | null> } };
};

/** Vigia o PC da loja. Chamada pela tarefa agendada do Worker (a cada 30 min no horário da loja), com o mesmo token do catálogo. */
export async function POST(request: Request) {
  const token = segredo("CATALOGO_READ_TOKEN");
  const enviado = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || !enviado || !iguais(token, enviado)) return Response.json({ ok: false, erro: "nao_autorizado" }, { status: 401, headers: SEM_CACHE });

  const agora = new Date();
  const batimento = await lerBatimentoPc();
  if (batimento === null) return Response.json({ ok: false, erro: "sem_leitura" }, { status: 502, headers: SEM_CACHE });
  const avaliacao = avaliarPc(PUBLIC_UNITS[0], batimento, agora);

  // Estado do último aviso no banco (se não houver banco, avisa uma vez por checagem parada e segue).
  const db = banco() as Banco | null;
  let anterior: EstadoAlerta = { estado: "ok", avisadoEm: null };
  if (db) {
    await db.exec("CREATE TABLE IF NOT EXISTS alerta_pc (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)");
    const linha = await db.prepare("SELECT valor FROM alerta_pc WHERE chave = ?").bind("estado").first<{ valor: string }>();
    try {
      if (linha) anterior = JSON.parse(linha.valor) as EstadoAlerta;
    } catch {
      anterior = { estado: "ok", avisadoEm: null };
    }
  }
  const decisao = decidirAviso(anterior, avaliacao.parado, agora.getTime());
  let notificou = false;
  if (decisao.enviar) {
    const t = textoDoAviso(decisao.enviar, avaliacao.idadeHoras);
    notificou = await enviarPush(t.titulo, t.corpo, t.prioridade);
  }
  if (db && decisao.enviar) {
    await db.prepare("INSERT OR REPLACE INTO alerta_pc (chave, valor) VALUES (?, ?)").bind("estado", JSON.stringify(decisao.proximo)).run();
  }
  return Response.json({ ok: true, idadeHoras: avaliacao.idadeHoras, parado: avaliacao.parado, aviso: decisao.enviar, notificou }, { headers: SEM_CACHE });
}
