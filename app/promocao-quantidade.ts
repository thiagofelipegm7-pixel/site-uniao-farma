import { banco } from "./estoque-fonte";
import { carregarCatalogoNacoes, slugify } from "./nacoes-unidas/produtos/catalogo";
import { carregarRestritos } from "./nacoes-unidas/produtos/receita";

import { faixasDaPromocao, type FaixaPromocaoQuantidade, type PromocaoQuantidade } from "./promocao-quantidade-tipos";
import { promocoesQuantidadeEncarteVigentes } from "./promocao-quantidade-encarte";
export type { FaixaPromocaoQuantidade, PromocaoQuantidade } from "./promocao-quantidade-tipos";
type BancoPromocao = { exec(sql: string): Promise<unknown>; prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }>; run(): Promise<unknown> } }; batch(statements: unknown[]): Promise<unknown> };

async function tabela(db: BancoPromocao) {
  // A tabela antiga é mantida para migrar as promoções atuais sem perder configuração.
  await db.exec("CREATE TABLE IF NOT EXISTS promocao_quantidade (slug TEXT PRIMARY KEY, quantidade INTEGER NOT NULL, preco_unitario_centavos INTEGER NOT NULL, atualizado_em TEXT NOT NULL)");
  await db.exec("CREATE TABLE IF NOT EXISTS promocao_quantidade_faixas (slug TEXT NOT NULL, quantidade INTEGER NOT NULL, preco_unitario_centavos INTEGER NOT NULL, atualizado_em TEXT NOT NULL, PRIMARY KEY (slug, quantidade))");
  await db.exec("INSERT OR IGNORE INTO promocao_quantidade_faixas (slug, quantidade, preco_unitario_centavos, atualizado_em) SELECT slug, quantidade, preco_unitario_centavos, atualizado_em FROM promocao_quantidade");
}

export function catalogoPermitido() {
  const itens = carregarCatalogoNacoes()?.itens ?? [];
  const restritos = carregarRestritos();
  const medicamentosComReceita = restritos.receita
    .filter((item) => !item.controlado && !item.esgotado && typeof item.preco === "number")
    .map((item) => ({ nome: item.nome, categoria: "Medicamentos", preco: item.preco as number, isMIP: false, restam: item.restam, esgotado: item.esgotado }));
  const medicamentosControlados = restritos.controlados
    .filter((item) => !item.esgotado && typeof item.preco === "number")
    .map((item) => ({ nome: item.nome, categoria: "Medicamentos", preco: item.preco as number, isMIP: false, restam: item.restam, esgotado: item.esgotado }));
  const permitidos = itens.filter((item) => !item.esgotado);
  return new Map([...permitidos, ...medicamentosComReceita, ...medicamentosControlados].map((item) => [slugify(item.nome), item]));
}

export async function listarPromocoesQuantidade(): Promise<PromocaoQuantidade[]> {
  const db = banco() as BancoPromocao | null;
  if (!db) return [];
  await tabela(db);
  const { results } = await db.prepare("SELECT slug, quantidade, preco_unitario_centavos FROM promocao_quantidade_faixas ORDER BY slug, quantidade").bind().all<{ slug: string; quantidade: number; preco_unitario_centavos: number }>();
  const catalogo = catalogoPermitido();
  const porProduto = new Map<string, FaixaPromocaoQuantidade[]>();
  for (const row of results ?? []) {
    const item = catalogo.get(row.slug);
    if (!item || row.quantidade < 1 || row.quantidade > 20 || (typeof item.restam === "number" && item.restam < row.quantidade) || row.preco_unitario_centavos < 1 || row.preco_unitario_centavos >= Math.round(item.preco * 100)) continue;
    const faixas = porProduto.get(row.slug) ?? [];
    faixas.push({ quantidade: row.quantidade, precoUnitarioCentavos: row.preco_unitario_centavos });
    porProduto.set(row.slug, faixas);
  }
  for (const encarte of promocoesQuantidadeEncarteVigentes()) {
    const item = catalogo.get(encarte.slug);
    if (!item) continue;
    const validas: FaixaPromocaoQuantidade[] = [];
    for (const faixa of encarte.faixas) {
      if (faixa.quantidade < 1 || faixa.quantidade > 20 || (typeof item.restam === "number" && item.restam < faixa.quantidade) || faixa.precoUnitarioCentavos < 1 || faixa.precoUnitarioCentavos >= Math.round(item.preco * 100)) continue;
      validas.push(faixa);
    }
    if (validas.length) porProduto.set(encarte.slug, validas);
  }
  return [...porProduto].flatMap(([slug, faixas]) => {
    const item = catalogo.get(slug);
    if (!item) return [];
    const validas = faixas.sort((a, b) => a.quantidade - b.quantidade);
    return validas.length ? [{ slug, nome: item.nome, faixas: validas }] : [];
  });
}

type EntradaPromocao = { slug: string; faixas: FaixaPromocaoQuantidade[] };

function normalizarEntrada(entrada: unknown): EntradaPromocao | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as Record<string, unknown>;
  if (typeof e.slug !== "string") return null;
  if (Array.isArray(e.faixas)) {
    return { slug: e.slug, faixas: e.faixas.map((faixa) => {
      const f = faixa && typeof faixa === "object" ? faixa as Record<string, unknown> : {};
      return { quantidade: Number(f.quantidade), precoUnitarioCentavos: Number(f.precoUnitarioCentavos) };
    }) };
  }
  // Aceita clientes antigos enquanto navegadores que ficaram abertos atualizam.
  return { slug: e.slug, faixas: faixasDaPromocao({ quantidade: Number(e.quantidade), precoUnitarioCentavos: Number(e.precoUnitarioCentavos) }) };
}

export async function salvarPromocoesQuantidade(entradas: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!Array.isArray(entradas) || entradas.length > 100) return { ok: false, erro: "Lista de promoções inválida." };
  const catalogo = catalogoPermitido();
  const validas: Array<{ slug: string; faixas: FaixaPromocaoQuantidade[] }> = [];
  for (const entrada of entradas) {
    const regra = normalizarEntrada(entrada);
    const item = regra ? catalogo.get(regra.slug) : undefined;
    const faixas = regra?.faixas ?? [];
    if (!regra || !item || faixas.length < 1 || faixas.length > 20) {
      return { ok: false, erro: "Cada produto precisa ter pelo menos uma faixa de preço preenchida." };
    }
    const ordenadas = [...faixas].sort((a, b) => a.quantidade - b.quantidade);
    for (let i = 0; i < ordenadas.length; i++) {
      const faixa = ordenadas[i];
      if (!Number.isInteger(faixa.quantidade) || faixa.quantidade < 1 || faixa.quantidade > 20 || (typeof item.restam === "number" && item.restam < faixa.quantidade) || !Number.isInteger(faixa.precoUnitarioCentavos) || faixa.precoUnitarioCentavos < 1 || faixa.precoUnitarioCentavos >= Math.round(item.preco * 100)) {
        return { ok: false, erro: "Cada faixa precisa ter quantidade de 1 a 20, dentro do estoque, e preço por unidade abaixo do preço normal." };
      }
      if (i > 0 && (faixa.quantidade === ordenadas[i - 1].quantidade || faixa.precoUnitarioCentavos > ordenadas[i - 1].precoUnitarioCentavos)) {
        return { ok: false, erro: "Não repita quantidades; o preço por unidade deve se manter ou diminuir nas faixas maiores." };
      }
    }
    if (validas.some((v) => v.slug === regra.slug)) return { ok: false, erro: "Não repita o mesmo produto." };
    validas.push({ slug: regra.slug, faixas: ordenadas });
  }
  const db = banco() as BancoPromocao | null;
  if (!db) return { ok: false, erro: "Banco de dados indisponível." };
  await tabela(db);
  const agora = new Date().toISOString();
  const statements = [db.prepare("DELETE FROM promocao_quantidade").bind(), db.prepare("DELETE FROM promocao_quantidade_faixas").bind()];
  for (const produto of validas) {
    for (const faixa of produto.faixas) {
      statements.push(db.prepare("INSERT INTO promocao_quantidade_faixas (slug, quantidade, preco_unitario_centavos, atualizado_em) VALUES (?, ?, ?, ?)").bind(produto.slug, faixa.quantidade, faixa.precoUnitarioCentavos, agora));
    }
    const legada = [...produto.faixas].filter((f) => f.quantidade >= 2).at(-1) ?? produto.faixas[0];
    statements.push(db.prepare("INSERT INTO promocao_quantidade (slug, quantidade, preco_unitario_centavos, atualizado_em) VALUES (?, ?, ?, ?)").bind(produto.slug, legada.quantidade, legada.precoUnitarioCentavos, agora));
  }
  await db.batch(statements);
  return { ok: true };
}
