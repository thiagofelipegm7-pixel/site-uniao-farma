/**
 * Buscas em que a busca exata não achou nada (a loja não tem, ou a pessoa escreveu de outro jeito). Serve para a equipe ver o que
 * falta no catálogo, nos sinônimos e nas palavras de busca. Anônimo: guarda só o texto normalizado, o dia e uma contagem. Nunca guarda
 * IP, cookie nem quem digitou. Termos de saúde sensível, números longos (telefone, CPF), e-mails e endereços são descartados.
 * Módulo sem Cloudflare (testável).
 */
import type { Banco } from "./nomes-corrigidos";

export const RESULTADOS_BUSCA = ["vazia", "corrigida", "parcial", "sugestao"] as const;
export type ResultadoBusca = (typeof RESULTADOS_BUSCA)[number];

const SENSIVEL = /\b(hiv|aids|dst|ist|sifilis|herpes|clamidia|gonorreia|hpv|aborto|abortiv\w*|pilulas?|dia seguinte|dia depois|postinor|cytotec|misoprostol|levonorgestrel|anticoncepc\w*|estupro|violencia|suicid\w*|depress\w*|ansiedade|impotencia|disfuncao|vicio|overdose|cocaina|maconha|crack|gravidez|gestante|menstrua\w*|tpm|cancer|quimioterapia)\b/;

function semAcento(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Texto pronto para guardar, ou null se não deve ser guardado (curto, longo, sensível, parece dado pessoal ou endereço). */
export function termoParaRegistro(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const cru = bruto.trim();
  if (cru.length < 3 || cru.length > 60 || /@|https?:|www\.|\.com|\.br\b/i.test(cru)) return null;
  const t = semAcento(cru).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 3 || t.length > 40 || t.split(" ").length > 6 || /\d{5,}/.test(t.replace(/ /g, "")) || !/[a-z]{2}/.test(t)) return null;
  if (SENSIVEL.test(t)) return null;
  return t;
}

export function resultadoValido(r: unknown): ResultadoBusca | null {
  return typeof r === "string" && (RESULTADOS_BUSCA as readonly string[]).includes(r) ? (r as ResultadoBusca) : null;
}

async function garantir(db: Banco) {
  await db.exec("CREATE TABLE IF NOT EXISTS busca_sem_resultado (termo TEXT NOT NULL, dia TEXT NOT NULL, resultado TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (termo, dia, resultado))");
}

export async function registrarBusca(db: Banco, termo: string, resultado: ResultadoBusca, dia: string, limpar = Math.random() < 0.02): Promise<void> {
  await garantir(db);
  await db.prepare("INSERT INTO busca_sem_resultado (termo, dia, resultado, n) VALUES (?, ?, ?, 1) ON CONFLICT(termo, dia, resultado) DO UPDATE SET n = n + 1").bind(termo, dia, resultado).run();
  // Guarda só 90 dias.
  if (limpar) await db.prepare("DELETE FROM busca_sem_resultado WHERE dia < date(?, '-90 day')").bind(dia).run();
}

export type LinhaBusca = { termo: string; total: number; vazia: number; ultimo: string };

/** Termos mais buscados sem resultado nos últimos dias, os que ficaram mesmo vazios primeiro. */
export async function topBuscas(db: Banco, dia: string, dias = 30, limite = 150): Promise<LinhaBusca[]> {
  await garantir(db);
  const { results } = await db
    .prepare(
      "SELECT termo, SUM(n) AS total, SUM(CASE WHEN resultado = 'vazia' THEN n ELSE 0 END) AS vazia, MAX(dia) AS ultimo FROM busca_sem_resultado WHERE dia >= date(?, ?) GROUP BY termo ORDER BY vazia DESC, total DESC, termo LIMIT ?",
    )
    .bind(dia, `-${dias} day`, limite)
    .all<LinhaBusca>();
  return results;
}
