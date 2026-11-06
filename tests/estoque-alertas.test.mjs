import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const alertas = await import("../app/estoque-alertas.ts");
const hist = await import("../app/estoque-historico.ts");

const dia = (n) => new Date(Date.parse("2026-11-06T12:00:00Z") - n * 86_400_000).toISOString().slice(0, 10);
const pontos = (valores) => valores.map((estoque, i) => ({ dia: dia(valores.length - i), estoque }));
const item = (chave, nome, estoque, preco = 10) => ({ chave, nome, lab: "", estoque, preco });

test("velocidade de venda pela queda do estoque; entrada de mercadoria não conta; histórico curto = null", () => {
  assert.equal(alertas.vendaPorDia(pontos([20, 19, 18])), null, "menos de 6 dias");
  const v = alertas.vendaPorDia(pontos([30, 28, 26, 24, 22, 20, 18])); // 7 pontos = 6 dias, 12 unidades
  assert.ok(v && Math.abs(v.porDia - 2) < 1e-9, "2 por dia");
  const reposto = alertas.vendaPorDia(pontos([10, 8, 6, 4, 2, 30, 28])); // quedas: 2+2+2+2+2 = 10 em 6 dias; a entrada (2→30) não é venda
  assert.ok(reposto && Math.abs(reposto.porDia - 10 / 6) < 1e-9);
});

test("alertas: baixo sem histórico; esgotado só se já teve estoque; acabando e parado com histórico", () => {
  const hoje = dia(0);
  // Sem histórico nenhum: só o aviso de poucas unidades.
  let r = alertas.gerarAlertas([item("1", "DIPIRONA", 2), item("2", "SABAO", 40), item("3", "ZERADO DE SEMPRE", 0)], new Map(), hoje);
  assert.deepEqual(r.map((a) => [a.nome, a.tipo]), [["DIPIRONA", "baixo"]]);
  assert.match(r[0].motivo, /Restam 2/);

  const h = new Map([
    ["10", pontos([12, 11, 10, 9, 8, 7, 6]).map((p) => ({ ...p, nome: "ACABOU" }))],
    ["20", pontos([40, 36, 32, 28, 24, 20, 16]).map((p) => ({ ...p, nome: "VENDE RAPIDO" }))],
    ["30", pontos(Array(23).fill(9)).map((p) => ({ ...p, nome: "ENCALHADO" }))],
  ]);
  const atual = [item("20", "VENDE RAPIDO", 12), item("30", "ENCALHADO", 9, 50)]; // "10" sumiu do export: acabou
  r = alertas.gerarAlertas(atual, h, hoje);
  const por = Object.fromEntries(r.map((a) => [a.nome, a]));
  assert.equal(por["ACABOU"].tipo, "esgotado");
  assert.equal(por["VENDE RAPIDO"].tipo, "acabando");
  assert.match(por["VENDE RAPIDO"].motivo, /Vende cerca de 28 por semana e restam 12: acaba em ~3 dias/);
  assert.equal(por["ENCALHADO"].tipo, "parado");
  assert.equal(por["ENCALHADO"].valorParado, 450);
  // Ordem: esgotado, acabando, baixo, parado.
  assert.deepEqual(r.map((a) => a.tipo), ["esgotado", "acabando", "parado"]);
});

test("resumo de WhatsApp lista por grupo e limita as linhas", () => {
  const hoje = dia(0);
  const muitos = Array.from({ length: 12 }, (_, i) => item(String(i), `ITEM ${i}`, 1));
  const texto = alertas.resumoWhatsApp(alertas.gerarAlertas(muitos, new Map(), hoje), "06/11/2026", 3);
  assert.match(texto, /^Estoque 06\/11\/2026/);
  assert.match(texto, /Estoque baixo \(12\)/);
  assert.match(texto, /… e mais 9/);
  assert.equal(alertas.resumoWhatsApp([], "06/11/2026"), "Estoque 06/11/2026: nada para repor hoje.");
});

test("histórico no banco: guarda só itens com estoque, lê por item e trata o dia ausente como zero", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return {
        bind: (...v) => ({
          async run() {
            if (/INSERT OR REPLACE/.test(sql)) linhas.set(v[0], v[1]);
            if (/DELETE/.test(sql)) for (const k of [...linhas.keys()]) if (k < v[0]) linhas.delete(k);
          },
          async all() {
            return { results: [...linhas.entries()].filter(([k]) => k >= v[0] && k < v[1]).sort().map(([d, dados]) => ({ dia: d, dados })) };
          },
        }),
      };
    },
  };
  await hist.salvarSnapshot(db, "2026-11-04", [item("a", "A", 5), item("b", "B", 0)]);
  await hist.salvarSnapshot(db, "2026-11-05", [item("b", "B", 3)]);
  assert.equal(JSON.parse(linhas.get("2026-11-04")).length, 1, "B com 0 não é guardado");
  const { porItem, diasRegistrados } = await hist.lerHistorico(db, "2026-11-06");
  assert.equal(diasRegistrados, 2);
  assert.deepEqual(porItem.get("a").map((p) => [p.dia, p.estoque]), [["2026-11-04", 5], ["2026-11-05", 0]]);
  assert.deepEqual(porItem.get("b").map((p) => [p.dia, p.estoque]), [["2026-11-04", 0], ["2026-11-05", 3]]);
  // Remove o que passou de 35 dias.
  await hist.salvarSnapshot(db, "2026-12-31", [item("c", "C", 1)]);
  assert.ok(!linhas.has("2026-11-04"));
});

test("export do DMaster vira itens; dia de Brasília; só o painel protegido e o cron token acessam o estoque", () => {
  const itens = hist.itensDoExport({ itens: [{ CodigoDeBarras: "789", Produto: " DIPIRONA  500MG ", Laboratorio: "EMS", Estoque: 3.9, Pvenda: 8 }, { CodigoDeBarras: "1", Produto: "TAXA DE ENTREGA", Estoque: 1, Pvenda: 1 }, { Produto: "SEM ESTOQUE NUMERICO", Estoque: null }] });
  assert.deepEqual(itens, [{ chave: "789", nome: "DIPIRONA 500MG", lab: "EMS", estoque: 3, preco: 8 }]);
  assert.equal(hist.diaBrasilia(new Date("2026-11-06T01:30:00Z")), "2026-11-05");
  const mw = readFileSync("middleware.ts", "utf8");
  assert.match(mw, /staffPath = [^;]*"\/api\/interno\/estoque"/);
  const snap = readFileSync("app/api/estoque-snapshot/route.ts", "utf8");
  assert.match(snap, /nao_autorizado/);
  assert.doesNotMatch(readFileSync("scripts/gerar-assets-catalogo.mjs", "utf8"), /estoque_dia/);
});
