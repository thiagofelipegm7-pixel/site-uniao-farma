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

test("vigia do PC: só avisa com a loja aberta, uma vez ao parar, a cada 6 h e ao voltar", async () => {
  const pc = await import("../app/estoque-pc.ts");
  const { PUBLIC_UNITS } = await import("../app/site-config.ts");
  const loja = PUBLIC_UNITS[0]; // Nações Unidas: seg a sáb 8h–21h, dom 8h–12h
  const brt = (iso) => new Date(`${iso}-03:00`); // hora de Brasília
  // Quarta 14h, último envio 11h: 3 h sem envio com a loja aberta = parado.
  assert.deepEqual(pc.avaliarPc(loja, brt("2026-11-04T11:00:00").getTime(), brt("2026-11-04T14:00:00")), { idadeHoras: 3, parado: true });
  // 1 h sem envio: normal.
  assert.equal(pc.avaliarPc(loja, brt("2026-11-04T13:00:00").getTime(), brt("2026-11-04T14:00:00")).parado, false);
  // Loja fechada (23h) ou recém-aberta (8h10, o PC ainda liga): não avisa, mesmo com envio antigo.
  assert.equal(pc.avaliarPc(loja, brt("2026-11-04T18:00:00").getTime(), brt("2026-11-04T23:00:00")).parado, false);
  assert.equal(pc.avaliarPc(loja, brt("2026-11-03T20:00:00").getTime(), brt("2026-11-04T08:10:00")).parado, false);
  assert.equal(pc.avaliarPc(loja, brt("2026-11-03T20:00:00").getTime(), brt("2026-11-04T09:00:00")).parado, true);
  assert.equal(pc.avaliarPc(loja, null, brt("2026-11-04T14:00:00")).parado, false, "sem leitura não alarma");

  const t0 = brt("2026-11-04T14:00:00").getTime();
  let d = pc.decidirAviso({ estado: "ok", avisadoEm: null }, true, t0);
  assert.equal(d.enviar, "parou");
  d = pc.decidirAviso(d.proximo, true, t0 + 30 * 60_000);
  assert.equal(d.enviar, null, "não repete a cada checagem");
  d = pc.decidirAviso(d.proximo, true, t0 + 6 * 3_600_000);
  assert.equal(d.enviar, "continua");
  d = pc.decidirAviso(d.proximo, false, t0 + 7 * 3_600_000);
  assert.equal(d.enviar, "voltou");
  assert.equal(pc.decidirAviso(d.proximo, false, t0 + 8 * 3_600_000).enviar, null);
  assert.match(pc.textoDoAviso("parou", 3).corpo, /nao envia o estoque há 3 h|nao envia o estoque ha 3 h|há 3 h/);
});

test("painel de fotos: cruza estoque x fotos do site, resume, filtra e gera CSV", async () => {
  const f = await import("../app/fotos-painel.ts");
  const itens = [
    { CodigoDeBarras: "111", Produto: "ADOCANTE ADOCYL STEVIA 80ML", Laboratorio: "COSMED", Estoque: 2, Pvenda: 12, Classe: "ETICO", ProdutoControlado: false },
    { CodigoDeBarras: "222", Produto: "ALPRAZOLAM 1MG 30CPR", Laboratorio: "EMS", Estoque: 5, Pvenda: 10, Classe: "GENERICO", ProdutoControlado: true },
    { CodigoDeBarras: "333", Produto: "ITEM ZERADO", Laboratorio: "DIVERSOS", Estoque: 0, Pvenda: 9 },
    { CodigoDeBarras: "444", Produto: "AMOXICILINA 500MG", Laboratorio: "EUROFARMA", Estoque: 3, Pvenda: 20, ProdutoAntimicrobiano: 1 },
    { CodigoDeBarras: "111", Produto: "REPETIDO", Estoque: 1, Pvenda: 1 },
    { CodigoDeBarras: "555", Produto: "TAXA DE ENTREGA", Estoque: 1, Pvenda: 1 },
  ];
  const categorias = new Map([[f.chaveDeNome("Adoçante Adocyl Stevia 80ml"), "Bem Estar"], [f.chaveDeNome("ALPRAZOLAM 1MG 30CPR"), "Controlados"]]);
  const linhas = f.montarLinhas(itens, new Set(["111"]), categorias);
  assert.deepEqual(linhas.map((l) => l.ean), ["111", "222", "333", "444"], "sem repetido nem taxa de entrega");
  assert.equal(linhas[0].categoria, "Bem Estar");
  assert.equal(linhas[0].noSite, true);
  assert.equal(linhas[1].controlado, true);
  assert.equal(linhas[2].lab, "", "DIVERSOS vira não identificado");
  assert.equal(linhas[2].categoria, f.SEM_CATEGORIA);
  assert.equal(linhas[2].valor, 0);
  assert.equal(linhas[3].antimicrobiano, true);
  assert.equal(linhas[1].valor, 50);
  const r = f.resumirFotos(linhas);
  assert.deepEqual([r.total, r.comFoto, r.faltam, r.faltamComEstoque, r.valorSemFoto], [4, 1, 3, 2, 110]);
  // À venda no site com foto: só o item 111 (222 é controlado; 333 e 444 não estão no catálogo do site).
  assert.deepEqual([r.aVenda, r.aVendaComFoto, r.aVendaFaltamComEstoque, r.aVendaValorSemFoto, r.fora], [1, 1, 0, 0, 3]);
  assert.deepEqual(f.filtrarLinhas(linhas, { fotos: "faltam", estoque: "com" }).map((l) => l.ean), ["222", "444"]);
  assert.deepEqual(f.filtrarLinhas(linhas, { tipo: "controlado" }).map((l) => l.ean), ["222"]);
  assert.deepEqual(f.filtrarLinhas(linhas, { busca: "amoxi" }).map((l) => l.ean), ["444"]);
  assert.deepEqual(f.filtrarLinhas(linhas, { fotos: "pc", marcados: new Set(["222", "111"]) }).map((l) => l.ean), ["222"], "marcado no PC e ainda sem foto no site");
  const csv = f.csvDasLinhas(f.filtrarLinhas(linhas, { fotos: "faltam" }), new Set(["222"]));
  assert.ok(csv.startsWith("﻿Código de barras;Produto"));
  assert.match(csv, /222;"ALPRAZOLAM 1MG 30CPR";"EMS";"Controlados";5;10,00;50,00;não;sim/);
  const rota = await (await import("node:fs/promises")).readFile(new URL("../app/api/interno/fotos/route.ts", import.meta.url), "utf8");
  assert.match(rota, /lerExportBruto/);
  const mw = await (await import("node:fs/promises")).readFile(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(mw, /staffPath = [^;]*"\/api\/interno\/fotos"/);
});
