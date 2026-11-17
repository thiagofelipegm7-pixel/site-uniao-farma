/**
 * Localiza um endereço de entrega (lado do servidor) no Nominatim/OpenStreetMap, restrito à região de Sabará/BH.
 * Guarda o resultado em memória e no D1 para não repetir a mesma busca (política de uso do Nominatim: 1 req/s, com User-Agent).
 */

type Statement = { bind(...v: unknown[]): Statement; first<T>(): Promise<T | null>; run(): Promise<unknown> };
type Banco = { exec(sql: string): Promise<unknown>; prepare(sql: string): Statement };

export type Local = { lat: number; lng: number; encontrado: string };

const memoria = new Map<string, Local>();
// Caixa que cobre Sabará e o entorno de BH (oeste, norte, leste, sul).
const VIEWBOX = "-44.10,-19.70,-43.60,-20.05";

export function normalizarEndereco(endereco: string) {
  return endereco.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function comCidade(endereco: string) {
  return /sabar[aá]|belo horizonte|\bmg\b|minas/i.test(endereco) ? endereco : `${endereco}, Sabará, MG`;
}

export async function geocodificar(enderecoBruto: string, db: Banco | null): Promise<Local | null> {
  const endereco = normalizarEndereco(enderecoBruto);
  const chave = endereco.toLocaleLowerCase("pt-BR");
  const emMemoria = memoria.get(chave);
  if (emMemoria) return emMemoria;
  if (db) {
    try {
      await db.exec("CREATE TABLE IF NOT EXISTS geocodigo_cache (chave TEXT PRIMARY KEY, lat REAL NOT NULL, lng REAL NOT NULL, encontrado TEXT NOT NULL, criado_em TEXT NOT NULL)");
      const linha = await db.prepare("SELECT lat, lng, encontrado FROM geocodigo_cache WHERE chave = ?").bind(chave).first<Local>();
      if (linha) {
        memoria.set(chave, linha);
        return linha;
      }
    } catch {
      // sem cache: segue para a busca
    }
  }
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", comCidade(endereco));
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("viewbox", VIEWBOX);
  url.searchParams.set("bounded", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("accept-language", "pt-BR");
  const resposta = await fetch(url, {
    headers: { "user-agent": "uniao-farma-sabara/1.0 (painel interno de entregas)", accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resposta.ok) return null;
  const lista = (await resposta.json().catch(() => [])) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const primeiro = Array.isArray(lista) ? lista[0] : undefined;
  const lat = Number(primeiro?.lat);
  const lng = Number(primeiro?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const local: Local = { lat, lng, encontrado: String(primeiro?.display_name || endereco).slice(0, 300) };
  memoria.set(chave, local);
  if (db) {
    try {
      await db.prepare("INSERT OR REPLACE INTO geocodigo_cache (chave, lat, lng, encontrado, criado_em) VALUES (?, ?, ?, ?, ?)")
        .bind(chave, lat, lng, local.encontrado, new Date().toISOString()).run();
    } catch {
      // cache é opcional
    }
  }
  return local;
}
