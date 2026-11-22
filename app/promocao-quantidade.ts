import { banco } from "./estoque-fonte";
import { carregarCatalogoNacoes, slugify } from "./nacoes-unidas/produtos/catalogo";

import type { PromocaoQuantidade } from "./promocao-quantidade-tipos";
export type { PromocaoQuantidade } from "./promocao-quantidade-tipos";
type BancoPromocao = { exec(sql: string): Promise<unknown>; prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }>; run(): Promise<unknown> } }; batch(statements: unknown[]): Promise<unknown> };

async function tabela(db: BancoPromocao) {
  await db.exec("CREATE TABLE IF NOT EXISTS promocao_quantidade (slug TEXT PRIMARY KEY, quantidade INTEGER NOT NULL, preco_unitario_centavos INTEGER NOT NULL, atualizado_em TEXT NOT NULL)");
}

export function catalogoPermitido() {
  const itens = carregarCatalogoNacoes()?.itens ?? [];
  return new Map(itens.filter((item) => !(item.categoria === "Medicamentos" && !item.isMIP) && !item.esgotado).map((item) => [slugify(item.nome), item]));
}

export async function listarPromocoesQuantidade(): Promise<PromocaoQuantidade[]> {
  const db = banco() as BancoPromocao | null;
  if (!db) return [];
  await tabela(db);
  const { results } = await db.prepare("SELECT slug, quantidade, preco_unitario_centavos FROM promocao_quantidade ORDER BY slug").bind().all<{ slug: string; quantidade: number; preco_unitario_centavos: number }>();
  const catalogo = catalogoPermitido();
  return (results ?? []).flatMap((row) => {
    const item = catalogo.get(row.slug);
    if (!item || row.quantidade < 2 || (typeof item.restam === "number" && item.restam < row.quantidade) || row.preco_unitario_centavos < 1 || row.preco_unitario_centavos >= Math.round(item.preco * 100)) return [];
    return [{ slug: row.slug, nome: item.nome, quantidade: row.quantidade, precoUnitarioCentavos: row.preco_unitario_centavos }];
  });
}

export async function salvarPromocoesQuantidade(entradas: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!Array.isArray(entradas) || entradas.length > 100) return { ok: false, erro: "Lista de promoções inválida." };
  const catalogo = catalogoPermitido();
  const validas: Array<{ slug: string; quantidade: number; preco: number }> = [];
  for (const entrada of entradas) {
    if (!entrada || typeof entrada !== "object") return { ok: false, erro: "Revise os produtos selecionados." };
    const e = entrada as Record<string, unknown>;
    const slug = typeof e.slug === "string" ? e.slug : "";
    const quantidade = Number(e.quantidade);
    const preco = Number(e.precoUnitarioCentavos);
    const item = catalogo.get(slug);
    if (!item || !Number.isInteger(quantidade) || quantidade < 2 || quantidade > 20 || (typeof item.restam === "number" && item.restam < quantidade) || !Number.isInteger(preco) || preco < 1 || preco >= Math.round(item.preco * 100)) {
      return { ok: false, erro: "Cada promoção precisa ter um produto elegível, quantidade de 2 a 20 e preço por unidade abaixo do preço atual." };
    }
    if (validas.some((v) => v.slug === slug)) return { ok: false, erro: "Não repita o mesmo produto." };
    validas.push({ slug, quantidade, preco });
  }
  const db = banco() as BancoPromocao | null;
  if (!db) return { ok: false, erro: "Banco de dados indisponível." };
  await tabela(db);
  const agora = new Date().toISOString();
  const statements = [db.prepare("DELETE FROM promocao_quantidade").bind()];
  for (const item of validas) statements.push(db.prepare("INSERT INTO promocao_quantidade (slug, quantidade, preco_unitario_centavos, atualizado_em) VALUES (?, ?, ?, ?)").bind(item.slug, item.quantidade, item.preco, agora));
  await db.batch(statements);
  return { ok: true };
}
