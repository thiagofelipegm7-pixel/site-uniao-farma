import { env } from "cloudflare:workers";
import { diaBrasilia, itensDoExport } from "./estoque-historico";
import type { ItemEstoque } from "./estoque-alertas";

// Mesmo endereço que a sincronização do catálogo lê (ops/catalogo-nacoes/sincronizar.py): export do DMaster com o estoque.
const URL_EXPORT = "https://dmaster-catalogo.thiagofelipegm7.workers.dev/catalogo?loja=itacolomi";

export function segredo(nome: string): string {
  try {
    const v = (env as unknown as Record<string, string | undefined>)[nome];
    if (v) return v.trim();
  } catch {
    // sem binding
  }
  return process.env[nome]?.trim() || "";
}

export function banco() {
  const db = (env as unknown as { DB?: unknown }).DB;
  return db ? (db as never) : null;
}

/** Estoque atual lido do Worker do PC da loja. Devolve null se o token faltar ou o Worker não responder. */
export async function lerEstoqueAtual(): Promise<{ itens: ItemEstoque[]; geradoEm: string | null; dia: string } | null> {
  const token = segredo("CATALOGO_READ_TOKEN");
  if (!token) return null;
  try {
    const r = await fetch(URL_EXPORT, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json", "user-agent": "uniao-farma-estoque" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    const dados = (await r.json()) as { geradoEm?: string };
    const itens = itensDoExport(dados);
    if (itens.length < 100) return null; // export truncado: melhor não registrar
    return { itens, geradoEm: typeof dados.geradoEm === "string" ? dados.geradoEm : null, dia: diaBrasilia() };
  } catch {
    return null;
  }
}

const URL_STATUS = "https://dmaster-catalogo.thiagofelipegm7.workers.dev/status?loja=itacolomi";

/** Instante (ms) do último envio do PC, lido do /status do Worker do catálogo. null se não der para ler. */
export async function lerBatimentoPc(): Promise<number | null> {
  const token = segredo("CATALOGO_READ_TOKEN");
  if (!token) return null;
  try {
    const r = await fetch(URL_STATUS, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json", "user-agent": "uniao-farma-vigia" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { batimentoEm?: string; recebidoEm?: string; geradoEm?: string };
    const texto = j.batimentoEm || j.recebidoEm || j.geradoEm;
    if (!texto) return null;
    // Sem fuso no texto = hora local do PC (Brasília, UTC-3).
    const ms = Date.parse(/(Z|[+-]\d{2}:?\d{2})$/.test(texto) ? texto : `${texto}-03:00`);
    return Number.isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}

/** Manda uma notificação ao celular pelo ntfy (app gratuito). O tópico é um segredo: quem o souber recebe os avisos. */
export async function enviarPush(titulo: string, corpo: string, prioridade: "high" | "default"): Promise<boolean> {
  const topico = segredo("NTFY_TOPIC");
  if (!topico) return false;
  const servidor = (segredo("NTFY_SERVER") || "https://ntfy.sh").replace(/\/$/, "");
  try {
    const r = await fetch(`${servidor}/${encodeURIComponent(topico)}`, {
      method: "POST",
      headers: { Title: titulo, Priority: prioridade, Tags: prioridade === "high" ? "warning" : "white_check_mark" },
      body: corpo,
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
