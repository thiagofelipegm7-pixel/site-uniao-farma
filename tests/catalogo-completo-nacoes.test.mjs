import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";

register(new URL("./resolve-ts.mjs", import.meta.url));

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
const json = async (f) => JSON.parse(await read(f));
const D = "app/nacoes-unidas/produtos/dados";
const rmod = () => import("../app/nacoes-unidas/produtos/receita.ts");

test("dados estáticos: sem estoque, código de barras ou segredos", async () => {
  for (const f of [`${D}/catalogo-nacoes.json`, `${D}/receita-nacoes.json`]) {
    const raw = await read(f);
    const chaves = new Set();
    JSON.stringify(JSON.parse(raw), (k, v) => (chaves.add(k), v));
    for (const proibida of ["estoque", "Estoque", "CodigoDeBarras", "barras", "token", "senha", "password"]) {
      assert.ok(!chaves.has(proibida), `${f} tem o campo ${proibida}`);
    }
    assert.doesNotMatch(raw, /\b[A-Za-z0-9_-]{32,}\b/, `${f} parece conter token`);
  }
});

test("dados estáticos: data dos dados é 31/10/2026 e totais batem", async () => {
  const cat = await json(`${D}/catalogo-nacoes.json`);
  const rx = await json(`${D}/receita-nacoes.json`);
  assert.match(cat.geradoEm, /^2026-10-31/);
  assert.match(rx.geradoEm, /^2026-10-31/);
  assert.equal(rx.totalReceita, rx.receita.length);
  assert.equal(rx.totalControlados, rx.controlados.length);
  assert.ok(cat.itens.length > 1000);
});

test("receita e controlados não aparecem no catálogo principal", async () => {
  const cat = await json(`${D}/catalogo-nacoes.json`);
  const rx = await json(`${D}/receita-nacoes.json`);
  const normal = new Set(cat.itens.map((i) => `${i.nome}|${i.lab}|${i.preco}`));
  for (const i of [...rx.receita, ...rx.controlados]) {
    assert.ok(!normal.has(`${i.nome}|${i.lab}|${i.preco}`), `${i.nome} está no catálogo normal`);
  }
});

test("todo item restrito tem nome e preço positivo; controlado tem lista da Portaria 344", async () => {
  const rx = await json(`${D}/receita-nacoes.json`);
  for (const i of [...rx.receita, ...rx.controlados]) {
    assert.ok(i.nome && i.nome.trim());
    assert.ok(typeof i.preco === "number" && i.preco > 0, i.nome);
  }
  for (const i of rx.controlados) assert.match(i.lista, /^(A1|A2|A3|B1|B2|C1|C2|C3|C4|C5)$/, i.nome);
});

test("avisos, selo e imagem genérica", async () => {
  const r = await rmod();
  assert.equal(r.AVISO_RECEITA, "Venda sob prescrição médica");
  assert.equal(r.AVISO_CONTROLADO, "Venda sob prescrição médica com retenção da receita");
  assert.equal(r.SELO_CONTROLADO, "Controlado");
  const img = await readFile(new URL(`../public${r.IMAGEM_GENERICA}`, import.meta.url));
  assert.ok(img.length > 1000);
});

test("lista restrita: sem cesta, oferta, % OFF, preço riscado ou destaque", async () => {
  for (const f of [
    "app/nacoes-unidas/produtos/ListaRestrita.tsx",
    "app/nacoes-unidas/produtos/receita/page.tsx",
    "app/nacoes-unidas/produtos/controlados/page.tsx",
    "app/nacoes-unidas/produtos/receita.ts",
  ]) {
    const src = (await read(f)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /ReservarBotao|ReservaFluxo|Adicionar|<del|<s>|line-through|% ?OFF|desconto|destaque|banner|isMIP/i, f);
  }
  const lista = await read("app/nacoes-unidas/produtos/ListaRestrita.tsx");
  assert.match(lista, /\{item\.aviso\}/);
  assert.match(lista, /SELO_CONTROLADO/);
  const { carregarRestritos, AVISO_CONTROLADO, AVISO_RECEITA, AVISO_RETENCAO } = await rmod();
  const c = carregarRestritos();
  assert.ok(c.controlados.length > 100 && c.receita.length > 100);
  for (const i of c.controlados) {
    assert.equal(i.aviso, AVISO_CONTROLADO, i.nome);
    assert.equal(i.controlado, true);
    assert.equal(i.rms, null);
  }
  for (const i of c.receita) {
    assert.ok([AVISO_RECEITA, AVISO_RETENCAO].includes(i.aviso), i.nome);
    assert.equal(i.controlado, false);
  }
  assert.match(lista, /Consultar/);
  assert.match(lista, /noindex|index: false/);
  const rxPage = await read("app/nacoes-unidas/produtos/receita/page.tsx");
  const ctPage = await read("app/nacoes-unidas/produtos/controlados/page.tsx");
  assert.match(rxPage, /ListaRestrita/);
  assert.match(ctPage, /ListaRestrita/);
});

test("lerNome: concentração e apresentação só quando legíveis", async () => {
  const { lerNome } = await rmod();
  const a = lerNome("ALPRAZOLAM 0.5MG CX 30CPR EMS", "EMS GENERI");
  assert.match(a.concentracao ?? "", /0[.,]5\s?mg/i);
  const b = lerNome("PRODUTO SEM NADA", "X");
  assert.equal(b.concentracao, null);
});

test("paginar e filtrarRestritos", async () => {
  const { paginar, filtrarRestritos } = await rmod();
  const itens = Array.from({ length: 100 }, (_, i) => ({ nome: `ITEM ${i}`, lab: "L", preco: 1 }));
  const p = paginar(itens, 3, 48);
  assert.equal(p.paginas, 3);
  assert.equal(p.itens.length, 4);
  assert.equal(paginar(itens, 99, 48).pagina, 3);
  assert.equal(filtrarRestritos(itens, "item 7").length >= 1, true);
});

test("CSV de controlados e duvidosos existe, sem barras vazias e sem segredos", async () => {
  const csv = await read("ops/catalogo-nacoes/relatorio-controlados-e-duvidosos.csv");
  const linhas = csv.trim().split(/\r?\n/);
  assert.match(linhas[0], /categoria;Produto;Laboratorio;Classe;Pvenda;ativo;lista;motivo;CodigoDeBarras/);
  assert.ok(linhas.some((l) => l.startsWith("controlado_publicado;")));
  assert.ok(linhas.some((l) => l.startsWith("duvidoso;")));
  assert.doesNotMatch(csv, /token|senha|password/i);
});
