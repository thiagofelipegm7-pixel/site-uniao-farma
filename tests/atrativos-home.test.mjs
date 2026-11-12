import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const A = await import("../app/nacoes-unidas/produtos/atrativos.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const item = (nome, lab, preco, extra = {}) => ({ nome, slug: nome.toLowerCase().replace(/\W+/g, "-"), lab, precoCentavos: Math.round(preco * 100), foto: "/produtos/1.webp", descricaoReal: false, ...extra });
const DIA = "2026-11-12";

test("vitrines da home: sem foto não entra, marca forte e preço bom pontuam mais, utilitário e item acabando pontuam menos", () => {
  assert.ok(A.pontuar(item("X", "", 20, { foto: null }), DIA) < -500);
  const forte = A.pontuar(item("Shampoo Dove 400ml", "UNILEVER", 24.9), DIA);
  const semMarca = A.pontuar(item("Shampoo 400ml", "", 24.9), DIA);
  assert.ok(forte > semMarca + 25, "marca conhecida vale muito");
  assert.ok(A.pontuar(item("Seringa 10 ml sem agulha", "DESCARPACK", 4), DIA) < semMarca - 30, "utilitário cai");
  assert.ok(A.pontuar(item("Autoteste Covid-19", "3M", 19.9), DIA) < semMarca - 30, "autoteste de covid fica fora das vitrines");
  assert.ok(A.pontuar(item("Shampoo Dove 400ml", "UNILEVER", 24.9, { restam: 2 }), DIA) < forte - 20, "acabando não é promovido");
  assert.ok(A.pontuar(item("Shampoo Dove 400ml", "UNILEVER", 24.9, { descricaoReal: true }), DIA) > forte + 10, "descrição de verdade ajuda");
  assert.ok(A.pontuar(item("Condicionador Seda (E)*", "UNILEVER", 24.9), DIA) < A.pontuar(item("Condicionador Seda", "UNILEVER", 24.9), DIA) - 30, "nome com resto de cadastro cai");
  assert.ok(A.pontuar(item("Laxante 6 comprimidos", "COSMED", 6.6, { isMIP: true }), DIA) < A.pontuar(item("Laxante 6 comprimidos", "COSMED", 6.6, { isMIP: true }), DIA, true), "medicamento só pontua inteiro na vitrine de medicamentos");
});

test("vitrines da home: no máximo 2 por marca, 1 por família de produto, completa quando a categoria é pequena", () => {
  const itens = [
    ...["8 un", "16 un", "10 un", "30 un"].map((q) => item(`Absorvente Always ${q}`, "PROCTER", 14)),
    item("Shampoo Dove Hidratação", "UNILEVER", 22), item("Condicionador Dove Hidratação", "UNILEVER", 22), item("Sabonete Dove Original", "UNILEVER", 6),
    item("Hidratante Nivea Soft", "NIVEA", 20),
  ];
  const sel = A.escolherAtrativos(itens, 4, DIA);
  assert.equal(sel.length, 4);
  assert.equal(sel.filter((i) => i.nome.includes("Always")).length, 1, "uma família por vez");
  assert.ok(sel.filter((i) => i.lab === "UNILEVER").length <= 2, "duas por marca no máximo");
  // Categoria pequena: sem variedade suficiente, completa com o que sobrou em vez de devolver vitrine curta.
  const pequena = A.escolherAtrativos(itens.slice(0, 4), 3, DIA);
  assert.equal(pequena.length, 3);
});

test("vitrines da home: a variação é do dia (estável durante o dia e diferente de um dia para o outro) e a rota usa a escolha", async () => {
  const slugs = Array.from({ length: 40 }, (_, i) => `produto-${i}`);
  const hoje = slugs.map((s) => A.variacaoDoDia(s, DIA));
  assert.deepEqual(hoje, slugs.map((s) => A.variacaoDoDia(s, DIA)));
  assert.notDeepEqual(hoje, slugs.map((s) => A.variacaoDoDia(s, "2026-11-13")));
  for (const v of hoje) assert.ok(v >= 0 && v <= 7);
  const rota = await ler("app/api/destaques/route.ts");
  assert.match(rota, /escolherAtrativos\(filtrados, n, dia, grupo === "medicamentos"\)/);
  assert.match(rota, /ordem"\) === "catalogo"/);
});
