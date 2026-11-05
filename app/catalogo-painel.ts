/**
 * Lógica pura do painel /interno/catalogo (sem Cloudflare nem rede, para testar em Node):
 * idade dos dados do PC, saúde (com a janela de horário da loja) e leitura das execuções da sincronização.
 * Nunca lida com estoque, código de barras ou itens.
 */

/** Acima disso o catálogo é considerado "fallback" (o PC da loja parou de enviar ou a sincronização foi recusada). */
export const LIMITE_FONTE_PC_HORAS = 36;
/** Durante o expediente, batimento do PC mais velho que isso (em horas) = problema. O PC manda heartbeat/delta a cada 10 min. */
export const LIMITE_EXPEDIENTE_HORAS = 0.75; // 45 min
export const LIMITE_BATIMENTO_MIN = 45;

/** "2026-11-05T11:00:06" (hora de Brasília, sem fuso) → instante em ms. */
export function instanteDoGeradoEm(geradoEm: string | undefined | null): number | null {
  if (!geradoEm || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(geradoEm)) return null;
  const ms = Date.parse(/(Z|[+-]\d{2}:\d{2})$/.test(geradoEm) ? geradoEm : `${geradoEm}-03:00`);
  return Number.isNaN(ms) ? null : ms;
}

export type StatusCatalogo = { geradoEm: string | null; total: number; fonte: "pc" | "fallback"; idadeHoras: number | null };

export function statusDoCatalogo(geradoEm: string | undefined | null, total: number, agora = Date.now()): StatusCatalogo {
  const instante = instanteDoGeradoEm(geradoEm);
  const idadeHoras = instante === null ? null : Math.max(0, Math.round(((agora - instante) / 3_600_000) * 10) / 10);
  const fonte = idadeHoras !== null && idadeHoras <= LIMITE_FONTE_PC_HORAS ? "pc" : "fallback";
  return { geradoEm: geradoEm ?? null, total, fonte, idadeHoras };
}

/** Segunda a sábado, das 08h às 21h em Brasília. Fora disso o PC pode estar legitimamente parado (noite, domingo). */
export function dentroDoExpediente(agora = Date.now()): boolean {
  const br = new Date(agora - 3 * 3_600_000);
  const dia = br.getUTCDay();
  const hora = br.getUTCHours() + br.getUTCMinutes() / 60;
  return dia >= 1 && dia <= 6 && hora >= 8 && hora < 21;
}

export type Saude = { nivel: "ok" | "atencao" | "problema"; titulo: string; detalhe: string };

/**
 * Saúde do painel. Se `idadeBatimentoHoras` vier do Worker, ela manda no alerta de "PC parado".
 * Sem batimento, usa a idade do conteúdo (geradoEm do site) — pode alarmar se preço/estoque ficaram iguais por >45 min;
 * o monitor do GitHub usa sempre o batimento e é a fonte da issue.
 */
export function avaliarSaude(status: StatusCatalogo, agora = Date.now(), idadeBatimentoHoras: number | null = null): Saude {
  const idadeSinal = idadeBatimentoHoras ?? status.idadeHoras;
  if (idadeSinal === null) return { nivel: "problema", titulo: "Sem data nos dados", detalhe: "O catálogo não traz a data do envio do PC." };
  if (dentroDoExpediente(agora)) {
    if (idadeSinal > LIMITE_EXPEDIENTE_HORAS) {
      const rotulo = idadeBatimentoHoras !== null ? "O último batimento do PC" : "Os dados";
      return {
        nivel: "problema",
        titulo: "PC ou sincronização parados",
        detalhe: `${rotulo} tem ${formatarIdade(idadeSinal)} (limite ${LIMITE_BATIMENTO_MIN} min no expediente 8h–21h). Confira o TERMINAL02 e a sincronização abaixo.`,
      };
    }
    const conteudo = status.idadeHoras === null ? "" : ` Última mudança de preço/estoque no site: ${formatarIdade(status.idadeHoras)}.`;
    return { nivel: "ok", titulo: "Em dia", detalhe: `Sinal do PC há ${formatarIdade(idadeSinal)}.${conteudo}` };
  }
  if (status.fonte === "fallback") {
    return { nivel: "atencao", titulo: "Dados antigos (fora do expediente)", detalhe: `Os dados têm ${formatarIdade(status.idadeHoras)}. Fora do expediente isso pode ser normal, mas passou de ${LIMITE_FONTE_PC_HORAS} h.` };
  }
  return { nivel: "ok", titulo: "Fora do expediente", detalhe: `Sinal há ${formatarIdade(idadeSinal)}. A checagem de ${LIMITE_BATIMENTO_MIN} min vale de segunda a sábado, das 8h às 21h.` };
}

export function formatarIdade(horas: number | null): string {
  if (horas === null) return "—";
  if (horas < 1) return `${Math.max(1, Math.round(horas * 60))} min`;
  if (horas < 48) return `${String(horas).replace(".", ",")} h`;
  return `${Math.round(horas / 24)} dias`;
}

// ---- Execuções da sincronização (API pública do GitHub, repositório público) ----

export const REPO = "thiagofelipegm7-pixel/site-uniao-farma";
export const WORKFLOW = "catalogo-sync.yml";

export type ExecucaoSync = {
  id: number;
  quando: string;
  origem: "agendado" | "manual" | "outro";
  estado: "sucesso" | "falha" | "andamento" | "cancelado";
  url: string;
  mensagens: { nivel: "erro" | "aviso" | "info"; texto: string }[];
};

type RunApi = { id: number; status: string; conclusion: string | null; event: string; created_at: string; html_url: string };

export function normalizarExecucao(run: RunApi, mensagens: ExecucaoSync["mensagens"] = []): ExecucaoSync {
  const estado: ExecucaoSync["estado"] =
    run.status !== "completed" ? "andamento" : run.conclusion === "success" ? "sucesso" : run.conclusion === "cancelled" ? "cancelado" : "falha";
  const origem: ExecucaoSync["origem"] = run.event === "schedule" ? "agendado" : run.event === "workflow_dispatch" ? "manual" : "outro";
  return { id: run.id, quando: run.created_at, origem, estado, url: run.html_url, mensagens };
}

type AnotacaoApi = { annotation_level?: string; message?: string; title?: string | null };

export function normalizarAnotacoes(lista: AnotacaoApi[]): ExecucaoSync["mensagens"] {
  return lista
    // Avisos do próprio GitHub (ex.: migração do runner) são ruído; só entram as anotações da sincronização (notice/failure).
    .filter((a) => a.message && a.annotation_level !== "warning")
    .map((a) => ({
      nivel: a.annotation_level === "failure" ? ("erro" as const) : ("info" as const),
      texto: String(a.message).slice(0, 400),
    }))
    .filter((m) => !/^Process completed with exit code/i.test(m.texto))
    .slice(0, 6);
}

type Buscar = (url: string, init?: RequestInit) => Promise<Response>;

/** Últimas execuções, com as anotações (motivo da recusa, resumo do que mudou) das 3 mais recentes. Falha de rede ou limite do GitHub devolve null. */
export async function buscarExecucoes(buscar: Buscar = fetch, limite = 5, comAnotacoes = 3): Promise<ExecucaoSync[] | null> {
  const cab = { accept: "application/vnd.github+json", "user-agent": "uniao-farma-painel", "x-github-api-version": "2022-11-28" };
  try {
    const r = await buscar(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=${limite}`, { headers: cab });
    if (!r.ok) return null;
    const runs = ((await r.json()) as { workflow_runs?: RunApi[] }).workflow_runs ?? [];
    const saida: ExecucaoSync[] = [];
    for (const [i, run] of runs.entries()) {
      let mensagens: ExecucaoSync["mensagens"] = [];
      if (i < comAnotacoes && run.status === "completed") {
        try {
          const jr = await buscar(`https://api.github.com/repos/${REPO}/actions/runs/${run.id}/jobs`, { headers: cab });
          const job = jr.ok ? ((await jr.json()) as { jobs?: { id: number }[] }).jobs?.[0] : undefined;
          if (job) {
            const ar = await buscar(`https://api.github.com/repos/${REPO}/check-runs/${job.id}/annotations`, { headers: cab });
            if (ar.ok) mensagens = normalizarAnotacoes((await ar.json()) as AnotacaoApi[]);
          }
        } catch {
          // sem anotações: mostra só o resultado
        }
      }
      saida.push(normalizarExecucao(run, mensagens));
    }
    return saida;
  } catch {
    return null;
  }
}

/** Contadores de uso da IA por dia (tipo, resultado → n), já somados. */
export type UsoIA = { tipo: string; resultado: string; n: number }[];

export function somarUso(linhas: { tipo: string; resultado: string; n: number }[]): UsoIA {
  const mapa = new Map<string, number>();
  for (const l of linhas) mapa.set(`${l.tipo}|${l.resultado}`, (mapa.get(`${l.tipo}|${l.resultado}`) ?? 0) + Number(l.n));
  return [...mapa.entries()].map(([k, n]) => ({ tipo: k.split("|")[0], resultado: k.split("|")[1], n })).sort((a, b) => b.n - a.n);
}
