import assert from "node:assert/strict";
import test from "node:test";
import { carregarSinais, chaveDoPedido, MIN_ITENS, ordenarPorConversao, pontosDeConversao, SINAIS_VAZIOS } from "../app/nacoes-unidas/produtos/mais-pedidos.ts";

const item = (nome, slug, nomeOriginal = nome) => ({ nome, nomeOriginal, slug });

test("chave do pedido: sem acento, maiúsculas e sem a variante do fim", () => {
  assert.equal(chaveDoPedido("Shampoo Elseve Colágeno 200ml"), "SHAMPOO ELSEVE COLAGENO 200ML");
  assert.equal(chaveDoPedido("Fralda Personal Baby — Tamanho G"), "FRALDA PERSONAL BABY");
});

test("pedido pesa mais que clique, e clique tem teto", () => {
  assert.ok(pontosDeConversao(1, 0) > pontosDeConversao(0, 10));
  assert.equal(pontosDeConversao(0, 15), pontosDeConversao(0, 500));
  assert.equal(pontosDeConversao(0, 0), 0);
  assert.equal(pontosDeConversao(Number.NaN, -3), 0);
});

test("ordena pelo sinal real e deixa de fora quem não tem nenhum", () => {
  const sinais = {
    pedidosPorNome: new Map([["SHAMPOO ELSEVE COLAGENO 200ML", 2], ["ABSORVENTE ALWAYS SUAVE COM 16 UNID", 1]]),
    cliquesPorSlug: new Map([["creme-x", 6]]),
  };
  const lista = [
    item("Absorvente Always Suave 16un", "always", "ABSORVENTE ALWAYS SUAVE COM 16 UNID"),
    item("Shampoo Elseve Colágeno 200ml", "elseve", "SHAMPOO ELSEVE COLAGENO 200ML"),
    item("Creme X", "creme-x"),
    item("Sem nenhum sinal", "nada"),
  ];
  assert.deepEqual(ordenarPorConversao(lista, sinais, 10).map((i) => i.slug), ["elseve", "always", "creme-x"]);
  assert.deepEqual(ordenarPorConversao(lista, sinais, 2).map((i) => i.slug), ["elseve", "always"]);
});

test("sem sinais a lista é vazia (a vitrine some, nada é inventado)", () => {
  assert.deepEqual(ordenarPorConversao([item("A", "a")], SINAIS_VAZIOS, 12), []);
  assert.ok(MIN_ITENS >= 3);
});

test("carrega os sinais do banco e trata falha como sem sinal", async () => {
  const consultas = [];
  const db = {
    exec: async () => {},
    prepare: (sql) => ({
      bind: (...valores) => ({
        run: async () => {},
        first: async () => null,
        all: async () => {
          consultas.push({ sql, valores });
          if (sql.includes("pre_venda")) return { results: [{ nome: "Fralda Personal Baby — G", n: 2 }, { nome: null, n: 5 }, { nome: "X", n: 0 }] };
          return { results: [{ slug: "creme-x", n: 4 }, { slug: "ruim", n: 0 }] };
        },
      }),
    }),
  };
  const sinais = await carregarSinais(db, "2026-11-26");
  assert.equal(sinais.pedidosPorNome.get("FRALDA PERSONAL BABY"), 2);
  assert.equal(sinais.pedidosPorNome.size, 1);
  assert.equal(sinais.cliquesPorSlug.get("creme-x"), 4);
  assert.equal(sinais.cliquesPorSlug.size, 1);
  assert.ok(consultas.every((c) => c.valores[0] === "2026-11-26" && c.valores[1] === "-60 day"));

  const quebrado = { exec: async () => {}, prepare: () => { throw new Error("sem tabela"); } };
  const vazio = await carregarSinais(quebrado, "2026-11-26");
  assert.equal(vazio.pedidosPorNome.size + vazio.cliquesPorSlug.size, 0);
});

test("a consulta de pedidos não lê dados de cliente", async () => {
  const sqls = [];
  const db = { exec: async () => {}, prepare: (sql) => { sqls.push(sql); return { bind: () => ({ run: async () => {}, first: async () => null, all: async () => ({ results: [] }) }) }; } };
  await carregarSinais(db, "2026-11-26");
  const pedidos = sqls.find((s) => s.includes("pre_venda"));
  assert.ok(pedidos);
  assert.doesNotMatch(pedidos, /telefone|aviso|nome_cliente|lembrete|codigo/i);
});
