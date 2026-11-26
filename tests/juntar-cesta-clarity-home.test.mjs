import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEPARTAMENTOS_SEM_MEDICAMENTOS, urlCatalogoSemMedicamentos } from "../app/shop/catalogo-sem-medicamentos.ts";

const ler = (rel) => readFile(new URL(`../${rel}`, import.meta.url), "utf8");

test("atalhos de preço e economia não incluem medicamentos e usam os params reais do catálogo", () => {
  assert.equal(DEPARTAMENTOS_SEM_MEDICAMENTOS.includes("Medicamentos"), false);
  const baratos = urlCatalogoSemMedicamentos({ ordem: "menor_preco" });
  const ate20 = urlCatalogoSemMedicamentos({ precoMaxReais: 20 });
  for (const href of [baratos, ate20]) {
    assert.match(href, /^\/nacoes-unidas\/produtos\?/);
    assert.doesNotMatch(href, /Medicamentos/);
    assert.match(href, /departamento=Dermocosm/);
    assert.match(href, /Cuidado\+Di/);
  }
  assert.match(baratos, /ordem=menor_preco/);
  assert.match(ate20, /preco_max=20/);
  assert.doesNotMatch(ate20, /ate=2000/);
});

test("FiltroPreco e ModoEconomia usam o helper sem medicamentos", async () => {
  const filtro = await ler("app/shop/FiltroPreco.tsx");
  const economia = await ler("app/shop/ModoEconomia.tsx");
  assert.match(filtro, /urlCatalogoSemMedicamentos/);
  assert.match(economia, /urlCatalogoSemMedicamentos/);
  assert.match(economia, /ordem: "menor_preco"/);
  assert.doesNotMatch(filtro, /\bate=\d+/);
  assert.doesNotMatch(economia, /ordem=preco/);
});

test("kits da home não citam remédio nem incentivam automedicação", async () => {
  const src = await ler("app/shop/SugestaoKit.tsx");
  assert.doesNotMatch(src, /dipirona|resfriado|paracetamol|ibuprofeno|vitamina c|primeiros socorros/i);
  assert.match(src, /Kit Bebê/);
  assert.match(src, /Kit Higiene/);
});

test("home monta checkout rápido, modo economia, kits, filtro de preço e recomendações da cesta", async () => {
  const home = await ler("app/HomePage.tsx");
  for (const nome of ["CheckoutRapido", "ModoEconomia", "SugestaoKit", "FiltroPreco", "RecomendacoesReais"]) {
    assert.match(home, new RegExp(`import ${nome} from "\\.\\/shop\\/${nome}"`));
    assert.match(home, new RegExp(`<${nome} />`));
  }
});

test("a cesta envolve título e ajuda em .fluxo-titulo, e o CSS não mira seletores mortos", async () => {
  const fluxo = await ler("app/reserva/ReservaFluxo.tsx");
  const shop = await ler("app/shop/shop.css");
  const bugs = await ler("app/mobile-bugs-fix.css");
  assert.match(fluxo, /className="fluxo-titulo"/);
  assert.match(fluxo, /className="fluxo-ajuda"/);
  assert.match(shop, /\.fluxo-topo \.fluxo-titulo/);
  assert.match(shop, /\.fluxo-topo \.fluxo-ajuda/);
  assert.doesNotMatch(shop, /\.fluxo-topo \{ flex-wrap: nowrap; \}/);
  assert.doesNotMatch(bugs, /\.revisar-itens h1/);
  assert.doesNotMatch(bugs, /\.cesta-titulo \{/);
  assert.match(bugs, /\.fluxo-topo h1/);
});

test("recomendações da cesta não inventam prova social de outros clientes", async () => {
  const src = await ler("app/shop/RecomendacoesReais.tsx");
  assert.doesNotMatch(src, /Quem levou isso também escolheu/i);
  assert.match(src, /CestaSugestoes/);
});
