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
