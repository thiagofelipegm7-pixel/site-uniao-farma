import { env } from "cloudflare:workers";
import { carregarCatalogoNacoes } from "../../../nacoes-unidas/produtos/catalogo";
import {
  avaliarSaude,
  instanteDoGeradoEm,
  REPO,
  somarUso,
  statusDoCatalogo,
  WORKFLOW,
  type EventoHistorico,
  type StatusPc,
} from "../../../catalogo-painel";
import { lerUsoIA } from "../../../ia-uso";

const WORKER_STATUS = "https://dmaster-catalogo.thiagofelipegm7.workers.dev/status?loja=itacolomi";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "cache-control": "no-store" };
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

async function lerStatusPc(agora: number): Promise<StatusPc | null> {
  const token = segredo("CATALOGO_READ_TOKEN");
  if (!token) return null;
  try {
    const r = await fetch(WORKER_STATUS, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json", "user-agent": "uniao-farma-painel" },
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      batimentoEm?: string;
      recebidoEm?: string;
      mudancaEm?: string;
      geradoEm?: string;
      total?: number;
      historico?: EventoHistorico[];
    };
    const bat = j.batimentoEm || j.recebidoEm || null;
    const batMs = bat ? instanteDoGeradoEm(bat) ?? Date.parse(bat) : null;
    const idadeBatimentoHoras =
      batMs && !Number.isNaN(batMs) ? Math.max(0, Math.round(((agora - batMs) / 3_600_000) * 10) / 10) : null;
    const historico = Array.isArray(j.historico)
      ? j.historico
          .filter((e) => e && (e.tipo === "delta" || e.tipo === "completo") && typeof e.quando === "string")
          .slice(0, 12)
          .map((e) => ({
            quando: e.quando,
            tipo: e.tipo === "completo" ? ("completo" as const) : ("delta" as const),
            aplicados: Number(e.aplicados) || 0,
            removidos: Number(e.removidos) || 0,
            nomes: Array.isArray(e.nomes) ? e.nomes.map((n) => String(n).slice(0, 60)).slice(0, 5) : [],
          }))
      : [];
    return {
      online: idadeBatimentoHoras !== null && idadeBatimentoHoras <= 0.75,
      batimentoEm: bat,
      idadeBatimentoHoras,
      mudancaEm: j.mudancaEm || null,
      geradoEm: j.geradoEm || null,
      total: typeof j.total === "number" ? j.total : null,
      historico,
    };
  } catch {
    return null;
  }
}

/**
 * Painel interno do catálogo. Sessão da equipe obrigatória.
 * Mostra se o PC está online (batimento), última mudança de estoque/preço, histórico de deltas e uso da IA.
 * Nunca devolve estoque, código de barras nem itens.
 */
export async function GET() {
  const agora = Date.now();
  const catalogo = carregarCatalogoNacoes();
  const status = statusDoCatalogo(catalogo?.geradoEm, catalogo?.itens.length ?? 0, agora);
  const [usoHoje, uso7, pc] = await Promise.all([lerUsoIA(1), lerUsoIA(7), lerStatusPc(agora)]);

  return Response.json(
    {
      agora: new Date(agora).toISOString(),
      catalogo: status,
      pc,
      saude: avaliarSaude(status, agora, pc?.idadeBatimentoHoras ?? null),
      ia: usoHoje === null || uso7 === null ? null : { hoje: somarUso(usoHoje), seteDias: somarUso(uso7) },
      forcar: { configurado: Boolean(segredo("GITHUB_DISPATCH_TOKEN")) },
      ajuda: {
        ritmo: "O PC da loja confere o estoque a cada 10 minutos. Se nada mudou, só avisa que está ligado; se mudou preço ou quantidade, manda só o que mudou.",
      },
    },
    { headers: SEM_CACHE },
  );
}

/** Força o site a baixar de novo o catálogo do Worker e republicar (não manda o PC ler o Dmaster de novo). */
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
    return Response.json({ ok: true }, { headers: SEM_CACHE });
  }
  ultimoDisparo = 0;
  return Response.json({ ok: false, erro: "github_recusou", status: r?.status ?? 0 }, { status: 502, headers: SEM_CACHE });
}
