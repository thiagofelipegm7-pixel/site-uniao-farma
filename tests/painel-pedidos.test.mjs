import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const P = await import("../app/pedidos-resumo.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

// 18/11/2026 15:00 em Brasília (18:00 UTC). Dados fictícios.
const AGORA = Date.parse("2026-11-18T18:00:00Z");
const pedido = (criadoEm, itens, status = "nova", totalCentavos) => ({
  criadoEm,
  itens,
  status,
  totalCentavos: totalCentavos ?? itens.reduce((s, i) => s + i.precoCentavos * i.quantidade, 0),
});
const FRALDA = { nome: "Fralda Exemplo G 30un", quantidade: 2, precoCentavos: 5000 };
const SABONETE = { nome: "Sabonete Teste 90g", quantidade: 3, precoCentavos: 300 };

test("pedidos: hoje começa à meia-noite de Brasília, não de UTC", () => {
  assert.equal(P.diaBrasilia(Date.parse("2026-11-19T02:00:00Z")), "2026-11-18");
  assert.equal(new Date(P.inicioPeriodo(AGORA, 1)).toISOString(), "2026-11-18T03:00:00.000Z");
  assert.equal(new Date(P.inicioPeriodo(AGORA, 7)).toISOString(), "2026-11-12T03:00:00.000Z");
});

test("pedidos: conta por período, faturamento só das concluídas e mais pedidos sem as canceladas", () => {
  const lista = [
    pedido("2026-11-18T13:00:00Z", [FRALDA], "concluida"),
    pedido("2026-11-18T02:30:00Z", [SABONETE], "nova"), // 17/11 23h30 em Brasília: fica fora de "hoje"
    pedido("2026-11-15T12:00:00Z", [FRALDA, SABONETE], "cancelada"),
    pedido("2026-10-25T12:00:00Z", [SABONETE], "atendimento"),
  ];
  const [hoje, sete, trinta] = P.resumirPedidos(lista, AGORA);
  assert.equal(hoje.pedidos, 1);
  assert.equal(hoje.faturamentoCentavos, 10_000);
  assert.equal(sete.pedidos, 3);
  assert.equal(sete.cancelados, 1);
  assert.equal(sete.emAberto, 1);
  assert.equal(sete.valorCestasCentavos, 10_900, "a cesta cancelada não soma");
  assert.equal(sete.faturamentoCentavos, 10_000);
  assert.equal(trinta.pedidos, 4);
  assert.deepEqual(trinta.maisVendidos.map((p) => [p.nome, p.quantidade, p.pedidos]), [["Sabonete Teste 90g", 6, 2], ["Fralda Exemplo G 30un", 2, 1]]);
});

test("pedidos: sem valor guardado ou sem venda concluída mostra 'sem dados ainda' (null), nunca R$ 0 inventado", () => {
  const [hoje] = P.resumirPedidos([pedido("2026-11-18T13:00:00Z", [SABONETE], "nova")], AGORA);
  assert.equal(hoje.faturamentoCentavos, null);
  assert.equal(hoje.valorCestasCentavos, 900);
  const vazio = P.resumirPedidos([], AGORA)[0];
  assert.equal(vazio.valorCestasCentavos, null);
  assert.deepEqual(vazio.maisVendidos, []);
  assert.equal(P.lerPedido({ criado_em: "2026-11-18T13:00:00Z", itens_json: "[]", total_centavos: 0, status: "nova" }).totalCentavos, null);
  assert.equal(P.lerPedido({ criado_em: "x", itens_json: "[]" }), null);
  assert.equal(P.lerPedido({ criado_em: "2026-11-18T13:00:00Z", itens_json: "{quebrado" }), null);
});

test("pedidos: lê do banco só colunas sem dado de cliente e junta as buscas sem resultado", async () => {
  const sqls = [];
  const db = {
    async exec(sql) { sqls.push(sql); },
    prepare(sql) {
      sqls.push(sql);
      return { bind: (...v) => ({
        async run() {},
        async first() { return null; },
        async all() {
          if (sql.includes("FROM pre_venda")) return { results: [{ criado_em: "2026-11-18T13:00:00Z", itens_json: JSON.stringify([FRALDA]), total_centavos: 10000, status: "concluida" }] };
          if (sql.includes("busca_sem_resultado")) return { results: v[1] === "-29 day" ? [{ termo: "protetor infantil teste", total: 3, vazia: 2, ultimo: "2026-11-17" }] : [] };
          return { results: [] };
        },
      }) };
    },
  };
  const painel = await P.lerPainelPedidos(db, AGORA);
  const select = sqls.find((s) => s.startsWith("SELECT") && s.includes("pre_venda"));
  assert.match(select, /SELECT criado_em, itens_json, total_centavos, status FROM pre_venda/);
  assert.doesNotMatch(select, /codigo|nome|telefone/);
  assert.equal(painel.periodos[0].pedidos, 1);
  assert.equal(painel.buscas["30d"][0].termo, "protetor infantil teste");
  assert.deepEqual(painel.buscas.hoje, []);
});

test("pedidos: tela protegida, no menu e com 'sem dados ainda'", async () => {
  const [nav, rota, painel, mw] = await Promise.all([ler("app/interno/itens-nav.ts"), ler("app/api/interno/pedidos/route.ts"), ler("app/components/PainelPedidos.tsx"), ler("middleware.ts")]);
  assert.match(nav, /href: "\/interno\/vendas"/);
  assert.match(rota, /lerPainelPedidos\(db/);
  assert.match(painel, /sem dados ainda/i);
  assert.match(painel, /\/api\/interno\/pedidos/);
  assert.match(mw, /pathname\.startsWith\("\/interno"\)/);
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
});
