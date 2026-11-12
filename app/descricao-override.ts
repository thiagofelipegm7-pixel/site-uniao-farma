/**
 * Descrição do produto escrita pela equipe no painel interno (vale mais que a de pesquisa e a de IA). Vazio volta ao automático.
 * Mesmas regras das descrições pesquisadas: só fatos do produto, sem promessa de efeito, sem medicamento. Histórico em
 * produto_alteracao_log. A sincronização escreve descricoes-painel.json.
 */
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export { chaveDoNome };

/** Promessa de efeito ou de resultado: não entra, venha de onde vier (mesma lista do teste das descrições pesquisadas). */
export const PROMESSAS = /\bcura\w*|\btrata\w*|\btratamento|\balivia\w*|\bprev[eé]m\w*|\bcombat\w*|\bclinicamente|\bcomprovad\w*|\beficaz\w*|\bgarant\w*|\bhipoalerg\w*|\bdermatologicamente|\bsem efeitos?\b|\b\d+ ?horas\b|\bpara que serve\b|R\$|[!?]/i;

export type ResultadoDescricao = { ok: true; texto: string | null; fonte: string | null } | { ok: false; erro: string };

/** Texto de 20 a 600 caracteres, sem marcação HTML nem promessa de efeito; fonte opcional em https. Texto vazio = volta ao automático. */
export function validarDescricao(textoBruto: unknown, fonteBruta: unknown): ResultadoDescricao {
  if (textoBruto === null || textoBruto === undefined) return { ok: true, texto: null, fonte: null };
  if (typeof textoBruto !== "string") return { ok: false, erro: "texto_invalido" };
  const texto = textoBruto.replace(/\s+/g, " ").trim();
  if (!texto) return { ok: true, texto: null, fonte: null };
  if (texto.length < 20 || texto.length > 600) return { ok: false, erro: "tamanho" };
  if (/[<>]/.test(texto)) return { ok: false, erro: "caracteres" };
  if (PROMESSAS.test(texto)) return { ok: false, erro: "promessa" };
  let fonte: string | null = null;
  if (typeof fonteBruta === "string" && fonteBruta.trim()) {
    try {
      const url = new URL(fonteBruta.trim());
      if (url.protocol !== "https:" || fonteBruta.trim().length > 300) return { ok: false, erro: "fonte" };
      fonte = url.toString();
    } catch {
      return { ok: false, erro: "fonte" };
    }
  }
  return { ok: true, texto, fonte };
}

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS produto_descricao (chave TEXT PRIMARY KEY, original TEXT NOT NULL, texto TEXT NOT NULL, fonte TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)");
  await db.exec(
    "CREATE TABLE IF NOT EXISTS produto_alteracao_log (id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, chave TEXT NOT NULL, titulo TEXT NOT NULL, acao TEXT NOT NULL, anterior TEXT, novo TEXT, por TEXT NOT NULL, quando TEXT NOT NULL)",
  );
}

type Linha = { chave: string; original: string; texto: string; fonte: string | null; por: string; quando: string };

async function log(db: Banco, a: { chave: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string }, agora: Date) {
  await db
    .prepare("INSERT INTO produto_alteracao_log (tipo, chave, titulo, acao, anterior, novo, por, quando) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind("descricao", a.chave, a.titulo, a.acao, a.anterior, a.novo, a.por, agora.toISOString())
    .run();
}

export async function definirDescricao(db: Banco, original: string, texto: string | null, fonte: string | null, por: string, agora = new Date()): Promise<void> {
  await garantir(db);
  const chave = chaveDoNome(original);
  const antes = await db.prepare("SELECT chave, original, texto, fonte, por, quando FROM produto_descricao WHERE chave = ?").bind(chave).first<Linha>();
  if (texto === null) {
    if (!antes) return;
    await db.prepare("DELETE FROM produto_descricao WHERE chave = ?").bind(chave).run();
    await log(db, { chave, titulo: original, acao: "voltou a descrição ao automático", anterior: antes.texto, novo: null, por }, agora);
    return;
  }
  await db.prepare("INSERT OR REPLACE INTO produto_descricao (chave, original, texto, fonte, por, quando) VALUES (?, ?, ?, ?, ?, ?)").bind(chave, original, texto, fonte, por, agora.toISOString()).run();
  await log(db, { chave, titulo: original, acao: antes ? "alterou a descrição" : "escreveu a descrição", anterior: antes?.texto ?? null, novo: texto, por }, agora);
}

export async function mapaDeDescricoes(db: Banco): Promise<Record<string, { texto: string; fonte: string | null; por: string; quando: string }>> {
  await garantir(db);
  const { results } = await db.prepare("SELECT chave, original, texto, fonte, por, quando FROM produto_descricao ORDER BY quando").bind().all<Linha>();
  const mapa: Record<string, { texto: string; fonte: string | null; por: string; quando: string }> = {};
  for (const l of results) mapa[l.chave] = { texto: l.texto, fonte: l.fonte, por: l.por, quando: l.quando };
  return mapa;
}
