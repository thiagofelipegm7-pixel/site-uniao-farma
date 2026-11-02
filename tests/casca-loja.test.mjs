import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");

test("home: casca antes do texto institucional e um único h1", async () => {
  const [home, casca, secoes] = await Promise.all([
    read("app/HomePage.tsx"),
    read("app/casca-loja.tsx"),
    read("app/home-sections.tsx"),
  ]);
  assert.equal((home.match(/<h1\b/g) ?? []).length, 1);
  assert.match(home, /Farmácia em Sabará: 3 lojas perto de você/);
  const ordem = ["BuscaLoja", "ReservaSacola", "BarraLoja", "CategoriasLoja", "CartaoMarinho", "OfertasSemana", "HomeReasons", "ComoFunciona", "UnitsShowcase", "FarmaceuticoCard", "<h1", "HomeSections"];
  let cursor = 0;
  for (const marco of ordem) {
    const em = home.indexOf(marco, cursor);
    assert.ok(em > cursor, `fora de ordem: ${marco}`);
    cursor = em;
  }
  assert.doesNotMatch(casca, /<h1\b/);
  assert.match(casca, /Separa pra você: reserve aqui e pague só quando retirar\./);
  assert.match(casca, /action="\/nacoes-unidas\/produtos"/);
  assert.doesNotMatch(casca, /trackEvent/);
  assert.match(casca, /CATEGORIAS_ORDEM/);
  assert.doesNotMatch(secoes, /<HomeReasons/);
});

test("categorias da casca usam a ordem real do catálogo, sem departamento inventado", async () => {
  const { CATEGORIAS_ORDEM } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const casca = await read("app/casca-loja.tsx");
  assert.match(casca, /href="\/ofertas"/);
  assert.match(casca, /slugify\(categoria\)/);
  assert.deepEqual(CATEGORIAS_ORDEM, [
    "Perfumaria e higiene",
    "Pele e proteção solar",
    "Suplementos e alimentos",
    "Medicamentos isentos de prescrição",
  ]);
  for (const categoria of CATEGORIAS_ORDEM) assert.ok(casca.includes(categoria), categoria);
});

test("a busca da home chega no catálogo pela URL e o analytics fica só com o tamanho", async () => {
  const { eventoBusca } = await import("../app/nacoes-unidas/produtos/busca.ts");
  const lista = await read("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(lista, /URLSearchParams\(window\.location\.search\)\.get\("q"\)/);
  assert.match(lista, /\.slice\(0,\s*80\)/);
  const evento = eventoBusca("nivea", 3);
  assert.equal(evento?.event, "catalog_search");
  assert.equal(evento?.params.term_length, 5);
  assert.equal("q" in (evento?.params ?? {}), false);
  assert.doesNotMatch(JSON.stringify(evento), /nivea/);
});

test("o endereço enviado no analytics tira o termo da busca e preserva a campanha", async () => {
  const analytics = await read("app/analytics.ts");
  assert.match(analytics, /export function pageLocationSemBusca/);
  assert.match(analytics, /searchParams\.delete\("q"\)/);
  assert.match(analytics, /page_location: pageLocationSemBusca\(window\.location\.href\)/);
  const limpa = new URL("https://www.uniaofarma.com.br/nacoes-unidas/produtos?q=nivea&utm_source=site");
  limpa.searchParams.delete("q");
  assert.equal(limpa.toString().includes("nivea"), false);
  assert.match(limpa.toString(), /utm_source=site/);
});
