import { banco } from "./estoque-fonte";

export const MAX_ITENS_PRE_VENDA = 40;

export type ResumoPreVenda = {
  requestId: string;
  codigo: string;
  unidade: string;
  modo: "retirar" | "casa";
  itens: Array<{ nome: string; quantidade: number; precoCentavos: number }>;
};

type Banco = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    bind(...values: unknown[]): {
      run(): Promise<{ meta?: { changes?: number } }>;
      first<T>(): Promise<T | null>;
    };
  };
};

export async function prepararTabelaPreVendas(db: Pick<Banco, "exec">) {
  // D1 exec interpreta cada linha como uma instrução SQL.
  await db.exec(`CREATE TABLE IF NOT EXISTS pre_venda (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL UNIQUE,
      codigo TEXT NOT NULL,
      unidade TEXT NOT NULL,
      modo TEXT NOT NULL,
      itens_json TEXT NOT NULL,
      total_centavos INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'nova',
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    )`.replace(/\s+/g, " "));
  await db.exec("CREATE INDEX IF NOT EXISTS pre_venda_criado_em ON pre_venda (criado_em DESC)");
}

export async function gravarPreVenda({ requestId, codigo, unidade, modo, itens }: ResumoPreVenda, conferirRepeticao = false) {
  const db = banco() as Banco | null;
  if (!db) return "sem_banco";
  const agora = new Date().toISOString();
  const total = itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
  try {
    await prepararTabelaPreVendas(db);
    // A cesta pode revelar informações sensíveis. Preserve a retenção usada pelo painel.
    const limite = new Date(Date.now() - 90 * 86_400_000).toISOString();
    await db.prepare("DELETE FROM pre_venda WHERE criado_em < ?").bind(limite).run();
    const itensJson = JSON.stringify(itens);
    const gravado = await db.prepare("INSERT OR IGNORE INTO pre_venda (id, request_id, codigo, unidade, modo, itens_json, total_centavos, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 'nova', ?, ?)")
      .bind(crypto.randomUUID(), requestId, codigo, unidade, modo, itensJson, total, agora, agora).run();
    if (conferirRepeticao && !gravado.meta?.changes) {
      const mesmo = await db.prepare("SELECT id FROM pre_venda WHERE request_id = ? AND codigo = ? AND unidade = ? AND modo = ? AND itens_json = ?")
        .bind(requestId, codigo, unidade, modo, itensJson).first<{ id: string }>();
      if (!mesmo) return "tentativa_invalida";
    }
    return null;
  } catch {
    return "falha_ao_gravar";
  }
}
