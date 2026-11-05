import { env } from "cloudflare:workers";
import { carregarCatalogoNacoes } from "../../../nacoes-unidas/produtos/catalogo";
import { avaliarSaude, buscarExecucoes, REPO, somarUso, statusDoCatalogo, WORKFLOW, type ExecucaoSync } from "../../../catalogo-painel";
import { lerUsoIA } from "../../../ia-uso";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "cache-control": "no-store" };
/** Segurados por instância para não estourar o limite de consultas anônimas do GitHub (60/h). */
let memoExecucoes: { em: number; dados: ExecucaoSync[] | null } | null = null;
let ultimoDisparo = 0;

function segredo(nome: string): string {
  try {
    const v = (env as unknown as Record<string, string | undefined>)[nome];
    if (v) return v.trim();
  } catch {
    // sem binding
  }
  return process.env[nome]?.trim() || "";
}

/**
 * Painel interno do catálogo. Só chega aqui com a sessão da equipe (middleware: cookie HttpOnly assinado).
 * Mostra data/idade dos dados do PC, fonte, execuções da sincronização (com o motivo de cada recusa) e uso da IA.
 * Nunca devolve estoque, código de barras nem itens.
 */
export async function GET() {
  const agora = Date.now();
  const catalogo = carregarCatalogoNacoes();
  const status = statusDoCatalogo(catalogo?.geradoEm, catalogo?.itens.length ?? 0, agora);

  if (!memoExecucoes || agora - memoExecucoes.em > 60_000) memoExecucoes = { em: agora, dados: await buscarExecucoes() };
  const [usoHoje, uso7] = await Promise.all([lerUsoIA(1), lerUsoIA(7)]);

  return Response.json(
    {
      agora: new Date(agora).toISOString(),
      catalogo: status,
      saude: avaliarSaude(status, agora),
      sincronizacao: { execucoes: memoExecucoes.dados, repositorio: `https://github.com/${REPO}/actions/workflows/${WORKFLOW}` },
      ia: usoHoje === null || uso7 === null ? null : { hoje: somarUso(usoHoje), seteDias: somarUso(uso7) },
      forcar: { configurado: Boolean(segredo("GITHUB_DISPATCH_TOKEN")) },
    },
    { headers: SEM_CACHE },
  );
}

/** "Forçar atualização": dispara o workflow de sincronização agora (baixa o último envio do PC e refaz o catálogo, com todas as travas). */
export async function POST(request: Request) {
  const origem = request.headers.get("origin");
  if (!origem || new URL(origem).host !== new URL(request.url).host) {
    return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
  }
  const token = segredo("GITHUB_DISPATCH_TOKEN");
  if (!token) return Response.json({ ok: false, erro: "token_ausente" }, { status: 501, headers: SEM_CACHE });
  if (Date.now() - ultimoDisparo < 120_000) return Response.json({ ok: false, erro: "aguarde" }, { status: 429, headers: SEM_CACHE });
  ultimoDisparo = Date.now();

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
  }).catch(() => null);

  if (r && r.status === 204) {
    memoExecucoes = null;
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  }
  ultimoDisparo = 0;
  return Response.json({ ok: false, erro: "github_recusou", status: r?.status ?? 0 }, { status: 502, headers: SEM_CACHE });
}
