/**
 * Microsoft Clarity: mapa de calor e gravação da visita, só depois do mesmo aceite de cookies do GA.
 * O script entra adiado (requestIdleCallback), para não competir com o LCP do banner.
 * Sem ID ou no painel /interno, nada é carregado.
 * Campos de busca, nome, telefone, endereço e as telas de pedido usam data-clarity-mask;
 * no painel do Clarity, o mascaramento precisa ficar em Strict.
 */
import { CLARITY_PROJECT_ID } from "./site-config";

export { CLARITY_PROJECT_ID };
export const CLARITY_SCRIPT_ID = "uniao-farma-clarity";
export const CLARITY_HOST = "https://www.clarity.ms/tag/";

export function urlDoClarity(projectId: string): string {
  return `${CLARITY_HOST}${encodeURIComponent(projectId)}`;
}

export function podeCarregarClarity({
  projectId = CLARITY_PROJECT_ID,
  aceito,
  pathname,
}: {
  projectId?: string;
  aceito: boolean;
  pathname: string;
}): boolean {
  if (!projectId.trim()) return false;
  if (!aceito) return false;
  if ((pathname || "").startsWith("/interno")) return false;
  return true;
}

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[] };
type ClarityWindow = Window & {
  clarity?: ClarityFn;
  __uniaoFarmaClarityAgendado?: boolean;
  __uniaoFarmaClarityCarregado?: boolean;
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

function janela(): ClarityWindow | null {
  return typeof window === "undefined" ? null : (window as ClarityWindow);
}

/** Insere o script oficial do Clarity (async). Só deve rodar depois do aceite e fora do /interno. */
export function inserirScriptClarity(projectId: string = CLARITY_PROJECT_ID): boolean {
  const id = projectId.trim();
  if (!id) return false;
  const w = janela();
  if (!w || !document.head) return false;
  if (w.__uniaoFarmaClarityCarregado || document.getElementById(CLARITY_SCRIPT_ID)) {
    w.__uniaoFarmaClarityCarregado = true;
    return false;
  }
  const clarity: ClarityFn = w.clarity || function (...args: unknown[]) {
    (clarity.q = clarity.q || []).push(args);
  };
  w.clarity = clarity;
  const script = document.createElement("script");
  script.id = CLARITY_SCRIPT_ID;
  script.async = true;
  script.src = urlDoClarity(id);
  document.head.appendChild(script);
  w.__uniaoFarmaClarityCarregado = true;
  clarity("consent");
  return true;
}

/**
 * Agenda o Clarity para quando o navegador estiver ocioso (ou, se não houver idle, no próximo instante).
 * Não bloqueia a pintura do banner.
 */
export function agendarClarity(opcoes: { projectId?: string; aceito: boolean; pathname: string }): void {
  if (!podeCarregarClarity(opcoes)) return;
  const w = janela();
  if (!w || w.__uniaoFarmaClarityAgendado || w.__uniaoFarmaClarityCarregado) return;
  w.__uniaoFarmaClarityAgendado = true;
  const id = (opcoes.projectId ?? CLARITY_PROJECT_ID).trim();
  const rodar = () => {
    inserirScriptClarity(id);
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(rodar, { timeout: 4000 });
  } else {
    w.setTimeout(rodar, 1);
  }
}
