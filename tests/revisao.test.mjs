import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const R = await import("../app/revisao.ts");

const fila = [
  { chave: "A|L", nome: "A", lab: "L", motivo: "variacao", rotulo: "x", detalhe: "", precoNovo: 13, precoAtual: 10, desde: "2026-11-08" },
  { chave: "B|L", nome: "B", lab: "L", motivo: "pmc", rotulo: "x", detalhe: "", precoNovo: 30, precoAtual: null, desde: "2026-11-08" },
  { chave: "C|L", nome: "C", lab: "L", motivo: "sem_categoria", rotulo: "x", detalhe: "", precoNovo: 5, precoAtual: null, desde: "2026-11-08" },
  { chave: "D|L", nome: "D", lab: "L", motivo: "preco_zero", rotulo: "x", detalhe: "", precoNovo: null, precoAtual: null, desde: "2026-11-08" },
  { chave: "E|L", nome: "E", lab: "L", motivo: "enquadramento", rotulo: "x", detalhe: "", precoNovo: 8, precoAtual: null, desde: "2026-11-08" },
];

test("revisão: o pedido de aprovação é conferido contra a fila (preço vem da fila, nome de quem aprova é obrigatório)", () => {
  const ok = R.validarPedido({ chave: "A|L", motivoFila: "variacao", por: "  Maria  ", valor: 999 }, fila);
  assert.deepEqual(ok, { ok: true, pedido: { chave: "A|L", tipo: "variacao", valor: 13, por: "Maria", motivo: "" } }, "o valor 999 do navegador é ignorado");
  assert.equal(R.validarPedido({ chave: "A|L", motivoFila: "variacao", por: "" }, fila).erro, "quem_aprova");
  assert.equal(R.validarPedido({ chave: "ZZ|L", motivoFila: "variacao", por: "Maria" }, fila).erro, "fora_da_fila");
  assert.equal(R.validarPedido({ chave: "D|L", motivoFila: "preco_zero", por: "Maria" }, fila).erro, "corrigir_na_origem");
  assert.equal(R.validarPedido({ chave: "B|L", motivoFila: "pmc", por: "João" }, fila).erro, "explique_o_motivo", "acima do teto exige justificativa");
  assert.equal(R.validarPedido({ chave: "B|L", motivoFila: "pmc", por: "João", motivo: "teto da lista está desatualizado" }, fila).pedido.valor, 30);
  assert.equal(R.validarPedido({ chave: "C|L", motivoFila: "sem_categoria", por: "Ana", valor: "Inventada" }, fila).erro, "categoria_invalida");
  assert.equal(R.validarPedido({ chave: "C|L", motivoFila: "sem_categoria", por: "Ana", valor: "Beleza" }, fila).pedido.valor, "Beleza");
  assert.equal(R.validarPedido({ chave: "E|L", motivoFila: "enquadramento", por: "Ana" }, fila).pedido.valor, "consulte");
});

test("revisão: aprovar e desfazer guardam o histórico (quem, quando, valor anterior)", async () => {
  const tabelas = { catalogo_aprovacao: [], catalogo_aprovacao_log: [] };
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT OR REPLACE INTO catalogo_aprovacao /.test(sql)) {
            const [chave, tipo, valor, por, motivo, quando] = v;
            const i = tabelas.catalogo_aprovacao.findIndex((l) => l.chave === chave && l.tipo === tipo);
            const linha = { chave, tipo, valor, por, motivo, quando };
            if (i >= 0) tabelas.catalogo_aprovacao[i] = linha; else tabelas.catalogo_aprovacao.push(linha);
          } else if (/^INSERT INTO catalogo_aprovacao_log/.test(sql)) {
            tabelas.catalogo_aprovacao_log.push({ args: v, sql });
          } else if (/^DELETE FROM catalogo_aprovacao /.test(sql)) {
            tabelas.catalogo_aprovacao = tabelas.catalogo_aprovacao.filter((l) => !(l.chave === v[0] && l.tipo === v[1]));
          }
        },
        first: async () => tabelas.catalogo_aprovacao.find((l) => l.chave === v[0] && l.tipo === v[1]) ?? null,
        all: async () => ({ results: tabelas.catalogo_aprovacao }),
      }),
    }),
  };
  await R.aprovar(db, { chave: "A|L", tipo: "variacao", valor: 13, por: "Maria", motivo: "" }, new Date("2026-11-08T12:00:00Z"));
  assert.deepEqual((await R.mapaDeAprovacoes(db))["A|L"].variacao, { valor: 13, por: "Maria", quando: "2026-11-08T12:00:00.000Z", motivo: "" }, "preço volta como número");
  await R.aprovar(db, { chave: "A|L", tipo: "variacao", valor: 14, por: "João", motivo: "reajuste" }, new Date("2026-11-08T13:00:00Z"));
  const trocada = tabelas.catalogo_aprovacao_log[1].args;
  assert.match(trocada[2], /"por":"Maria"/, "o log guarda a aprovação anterior (valor antigo)");
  assert.equal(await R.desfazer(db, "A|L", "variacao", "Ana"), true);
  assert.deepEqual(await R.mapaDeAprovacoes(db), {});
  assert.equal(await R.desfazer(db, "A|L", "variacao", "Ana"), false);
  assert.equal(tabelas.catalogo_aprovacao_log.length, 3);
});

test("revisão: rotas e arquivos do plano existem e a rota pública exige o token", async () => {
  const pub = await readFile(new URL("../app/api/catalogo-aprovacoes/route.ts", import.meta.url), "utf8");
  assert.match(pub, /CATALOGO_READ_TOKEN/);
  assert.match(pub, /nao_autorizado/);
  const mw = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(mw, /staffPath = [^;]*"\/api\/interno\/revisao\/aprovar"/);
  const fluxo = await readFile(new URL("../.github/workflows/catalogo-sync.yml", import.meta.url), "utf8");
  assert.match(fluxo, /revisao-pendente\.json/);
  const fila = JSON.parse(await readFile(new URL("../app/nacoes-unidas/produtos/dados/revisao-pendente.json", import.meta.url), "utf8"));
  assert.ok(Array.isArray(fila.itens));
});
