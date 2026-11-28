/**
 * Variações de produto: produtos do catálogo que são o mesmo item em tamanhos, cores ou sabores diferentes
 * (ex.: fralda P, M, G, XG). Cada tamanho continua sendo um produto próprio, com estoque, preço e página; o grupo só liga
 * as páginas entre si e dá o rótulo de cada ficha ("G", "Azul"). Configurado no painel interno, lido pela página do produto.
 */
export type VariacaoMembro = { ean: string; rotulo: string };
export type GrupoVariacao = { grupo: string; eixo: string; itens: VariacaoMembro[] };

type BancoVariacoes = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
  };
  batch(statements: unknown[]): Promise<unknown>;
};

export const MIN_MEMBROS = 2;
export const MAX_MEMBROS = 12;
export const EIXOS_SUGERIDOS = ["Tamanho", "Cor", "Sabor", "Voltagem", "Fragrância"] as const;

type Linha = { ean: string; grupo: string; eixo: string; rotulo: string };

async function criarTabela(db: BancoVariacoes): Promise<void> {
  await db.exec("CREATE TABLE IF NOT EXISTS variacao_produto (ean TEXT PRIMARY KEY, grupo TEXT NOT NULL, eixo TEXT NOT NULL, rotulo TEXT NOT NULL, ordem INTEGER NOT NULL, atualizado_em TEXT NOT NULL)");
}

const limpar = (valor: unknown): string => (typeof valor === "string" ? valor.replace(/\s+/g, " ").trim() : "");

/** Grupo em que o produto está (com todos os membros, na ordem escolhida), ou null se ele não tem variações. */
export async function grupoDoProduto(db: BancoVariacoes, ean: string): Promise<GrupoVariacao | null> {
  if (!/^\d{8,14}$/.test(ean)) return null;
  // Leitura sem criar a tabela (a página de produto lê isto a cada visita): uma ida ao banco só. A tabela nasce no primeiro "salvar".
  let linhas: Linha[] = [];
  try {
    const { results } = await db
      .prepare("SELECT ean, grupo, eixo, rotulo FROM variacao_produto WHERE grupo = (SELECT grupo FROM variacao_produto WHERE ean = ?) ORDER BY ordem, ean")
      .bind(ean)
      .all<Linha>();
    linhas = results ?? [];
  } catch {
    return null; // tabela ainda não existe: ninguém configurou variações
  }
  if (linhas.length < MIN_MEMBROS) return null;
  return { grupo: linhas[0].grupo, eixo: linhas[0].eixo, itens: linhas.map((l) => ({ ean: l.ean, rotulo: l.rotulo })) };
}

export type ResultadoSalvar = { ok: true; grupo: GrupoVariacao } | { ok: false; erro: string };

/**
 * Salva o grupo do produto `ean`. `itens` é a lista completa na ordem de exibição e inclui o próprio produto.
 * Um produto só pode estar em um grupo: quem já estava em outro sai de lá, e grupo que fica com menos de 2 produtos é apagado.
 */
export async function salvarGrupo(db: BancoVariacoes, ean: string, eixoEntrada: unknown, itensEntrada: unknown): Promise<ResultadoSalvar> {
  if (!/^\d{8,14}$/.test(ean)) return { ok: false, erro: "ean_invalido" };
  const eixo = limpar(eixoEntrada) || "Tamanho";
  if (eixo.length > 24) return { ok: false, erro: "eixo_invalido" };
  if (!Array.isArray(itensEntrada) || itensEntrada.length < MIN_MEMBROS || itensEntrada.length > MAX_MEMBROS) return { ok: false, erro: "variacoes_invalidas" };

  const itens: VariacaoMembro[] = [];
  for (const entrada of itensEntrada) {
    if (!entrada || typeof entrada !== "object") return { ok: false, erro: "variacoes_invalidas" };
    const e = entrada as Record<string, unknown>;
    const codigo = limpar(e.ean);
    const rotulo = limpar(e.rotulo);
    if (!/^\d{8,14}$/.test(codigo)) return { ok: false, erro: "ean_invalido" };
    if (!rotulo || rotulo.length > 24) return { ok: false, erro: "rotulo_invalido" };
    if (itens.some((i) => i.ean === codigo)) return { ok: false, erro: "produto_repetido" };
    if (itens.some((i) => i.rotulo.toLocaleLowerCase("pt-BR") === rotulo.toLocaleLowerCase("pt-BR"))) return { ok: false, erro: "rotulo_repetido" };
    itens.push({ ean: codigo, rotulo });
  }
  if (!itens.some((i) => i.ean === ean)) return { ok: false, erro: "produto_fora_do_grupo" };

  await criarTabela(db);
  const atual = await grupoDoProduto(db, ean);
  const grupo = atual?.grupo ?? `grupo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const agora = new Date().toISOString();
  const statements: unknown[] = [];
  if (atual) statements.push(db.prepare("DELETE FROM variacao_produto WHERE grupo = ?").bind(grupo));
  for (const i of itens) statements.push(db.prepare("DELETE FROM variacao_produto WHERE ean = ?").bind(i.ean));
  itens.forEach((i, ordem) => statements.push(db.prepare("INSERT INTO variacao_produto (ean, grupo, eixo, rotulo, ordem, atualizado_em) VALUES (?, ?, ?, ?, ?, ?)").bind(i.ean, grupo, eixo, i.rotulo, ordem, agora)));
  statements.push(db.prepare("DELETE FROM variacao_produto WHERE grupo IN (SELECT grupo FROM variacao_produto GROUP BY grupo HAVING COUNT(*) < ?)").bind(MIN_MEMBROS));
  await db.batch(statements);
  return { ok: true, grupo: { grupo, eixo, itens } };
}

/** Desfaz o grupo inteiro do produto (as páginas voltam a ser independentes). */
export async function removerGrupo(db: BancoVariacoes, ean: string): Promise<{ ok: boolean; erro?: string }> {
  if (!/^\d{8,14}$/.test(ean)) return { ok: false, erro: "ean_invalido" };
  await criarTabela(db);
  await db.prepare("DELETE FROM variacao_produto WHERE grupo = (SELECT grupo FROM variacao_produto WHERE ean = ?)").bind(ean).run();
  return { ok: true };
}
