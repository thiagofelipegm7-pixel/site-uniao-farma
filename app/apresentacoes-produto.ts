import { listarColecao } from "./colecoes-fotos";
import type { ApresentacaoProduto, ApresentacaoPublica } from "./apresentacao-produto-tipos";

type BancoApresentacoes = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
      first<T>(): Promise<T | null>;
    };
  };
  batch(statements: unknown[]): Promise<unknown>;
};

async function criarTabela(db: BancoApresentacoes): Promise<void> {
  await db.exec("CREATE TABLE IF NOT EXISTS apresentacao_produto (ean TEXT NOT NULL, id TEXT NOT NULL, nome TEXT NOT NULL, foto_ordem INTEGER NOT NULL, preco_centavos INTEGER NOT NULL, ordem INTEGER NOT NULL, atualizado_em TEXT NOT NULL, PRIMARY KEY (ean, id))");
}

export async function listarApresentacoes(db: BancoApresentacoes, ean: string): Promise<ApresentacaoProduto[]> {
  await criarTabela(db);
  const { results } = await db.prepare("SELECT id, nome, foto_ordem AS fotoOrdem, preco_centavos AS precoCentavos FROM apresentacao_produto WHERE ean = ? ORDER BY ordem, id").bind(ean).all<ApresentacaoProduto>();
  return results ?? [];
}

export async function listarTodasApresentacoes(db: BancoApresentacoes): Promise<ApresentacaoPublica[]> {
  await criarTabela(db);
  const { results } = await db.prepare("SELECT ean, id, nome, foto_ordem AS fotoOrdem, preco_centavos AS precoCentavos FROM apresentacao_produto ORDER BY ean, ordem, id").bind().all<Omit<ApresentacaoPublica, "foto">>();
  return (results ?? []).map((a) => ({ ...a, foto: a.fotoOrdem ? `/api/apresentacoes-produto?ean=${encodeURIComponent(a.ean)}&ordem=${a.fotoOrdem}&imagem=1` : null }));
}

export async function salvarApresentacoes(db: BancoApresentacoes, ean: string, entradas: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!/^\d{8,14}$/.test(ean)) return { ok: false, erro: "ean_invalido" };
  if (!Array.isArray(entradas) || entradas.length === 1 || entradas.length > 6) return { ok: false, erro: "apresentacoes_invalidas" };
  await criarTabela(db);
  if (entradas.length === 0) {
    await db.prepare("DELETE FROM apresentacao_produto WHERE ean = ?").bind(ean).run();
    return { ok: true };
  }
  const fotos = await listarColecao(db, ean);
  const validas: ApresentacaoProduto[] = [];
  for (let indice = 0; indice < entradas.length; indice += 1) {
    const entrada = entradas[indice];
    if (!entrada || typeof entrada !== "object") return { ok: false, erro: "apresentacoes_invalidas" };
    const e = entrada as Record<string, unknown>;
    const id = typeof e.id === "string" && /^[a-zA-Z0-9_-]{1,48}$/.test(e.id) ? e.id : `opcao-${indice + 1}`;
    const nome = typeof e.nome === "string" ? e.nome.replace(/\s+/g, " ").trim() : "";
    const fotoOrdem = Number(e.fotoOrdem);
    const precoCentavos = Number(e.precoCentavos);
    if (!nome || nome.length > 48 || !Number.isInteger(fotoOrdem) || fotoOrdem < 0 || fotoOrdem > 6 || (fotoOrdem > 0 && !fotos.some((f) => f.ordem === fotoOrdem)) || !Number.isInteger(precoCentavos) || precoCentavos < 1) {
      return { ok: false, erro: "apresentacao_invalida" };
    }
    if (validas.some((v) => v.id === id || v.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) return { ok: false, erro: "apresentacao_repetida" };
    validas.push({ id, nome, fotoOrdem, precoCentavos });
  }
  const agora = new Date().toISOString();
  const statements: unknown[] = [db.prepare("DELETE FROM apresentacao_produto WHERE ean = ?").bind(ean)];
  validas.forEach((a, ordem) => statements.push(db.prepare("INSERT INTO apresentacao_produto (ean, id, nome, foto_ordem, preco_centavos, ordem, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ean, a.id, a.nome, a.fotoOrdem, a.precoCentavos, ordem, agora)));
  await db.batch(statements);
  return { ok: true };
}

export async function ajustarApresentacoesAoRemoverFoto(db: BancoApresentacoes, ean: string, ordem: number): Promise<void> {
  await criarTabela(db);
  await db.prepare("UPDATE apresentacao_produto SET foto_ordem = CASE WHEN foto_ordem = ? THEN 0 WHEN foto_ordem > ? THEN foto_ordem - 1 ELSE foto_ordem END WHERE ean = ?").bind(ordem, ordem, ean).run();
}

export async function ajustarApresentacoesAoMoverFoto(db: BancoApresentacoes, ean: string, ordem: number, direcao: -1 | 1): Promise<void> {
  const alvo = ordem + direcao;
  if (alvo < 1) return;
  await criarTabela(db);
  const statements = [
    db.prepare("UPDATE apresentacao_produto SET foto_ordem = -1 WHERE ean = ? AND foto_ordem = ?").bind(ean, ordem),
    db.prepare("UPDATE apresentacao_produto SET foto_ordem = ? WHERE ean = ? AND foto_ordem = ?").bind(ordem, ean, alvo),
    db.prepare("UPDATE apresentacao_produto SET foto_ordem = ? WHERE ean = ? AND foto_ordem = -1").bind(alvo, ean),
  ];
  await db.batch(statements);
}

export async function lerFotoApresentacao(db: BancoApresentacoes, ean: string, ordem: number): Promise<{ mime: string; base64: string } | null> {
  const escolhas = await listarApresentacoes(db, ean);
  if (!escolhas.some((a) => a.fotoOrdem === ordem)) return null;
  const foto = await db.prepare("SELECT mime, base64 FROM foto_colecao WHERE ean = ? AND ordem = ?").bind(ean, ordem).first<{ mime: string; base64: string }>();
  return foto ?? null;
}
