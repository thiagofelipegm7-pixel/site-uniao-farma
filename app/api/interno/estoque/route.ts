import { gerarAlertas, resumoWhatsApp } from "../../../estoque-alertas";
import { banco, lerEstoqueAtual } from "../../../estoque-fonte";
import { lerHistorico, salvarSnapshot } from "../../../estoque-historico";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

function dataBr(dia: string) {
  const [a, m, d] = dia.split("-");
  return `${d}/${m}/${a}`;
}

/** Alertas de estoque (painel interno; a senha é pedida pelo middleware). */
export async function GET() {
  const atual = await lerEstoqueAtual();
  if (!atual) return Response.json({ ok: false, erro: "sem_dados" }, { status: 502, headers: SEM_CACHE });
  const db = banco();
  const hist = db ? await lerHistorico(db, atual.dia).catch(() => null) : null;
  const alertas = gerarAlertas(atual.itens, hist?.porItem ?? new Map(), atual.dia);
  return Response.json(
    {
      ok: true,
      dia: atual.dia,
      geradoEm: atual.geradoEm,
      diasRegistrados: hist?.diasRegistrados ?? 0,
      semBanco: !db,
      totais: { esgotado: alertas.filter((a) => a.tipo === "esgotado").length, acabando: alertas.filter((a) => a.tipo === "acabando").length, baixo: alertas.filter((a) => a.tipo === "baixo").length, parado: alertas.filter((a) => a.tipo === "parado").length },
      alertas: alertas.slice(0, 300),
      resumo: resumoWhatsApp(alertas, dataBr(atual.dia)),
    },
    { headers: SEM_CACHE },
  );
}

/** Registra o estoque de hoje agora (para começar o histórico sem esperar a tarefa agendada). */
export async function POST(request: Request) {
  const origem = request.headers.get("origin");
  if (!origem || new URL(origem).host !== new URL(request.url).host) {
    return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
  }
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const atual = await lerEstoqueAtual();
  if (!atual) return Response.json({ ok: false, erro: "sem_dados" }, { status: 502, headers: SEM_CACHE });
  const itens = await salvarSnapshot(db, atual.dia, atual.itens);
  return Response.json({ ok: true, dia: atual.dia, itens }, { headers: SEM_CACHE });
}
