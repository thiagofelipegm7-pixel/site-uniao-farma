import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const mod = () => import("../app/nacoes-unidas/produtos/catalogo.ts");
const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");

const fakeFetch = (payload, ok = true) => async () => ({ ok, json: async () => payload });

test("catálogo Nações: descarta itens inválidos e nunca expõe estoque", async () => {
  const { fetchCatalogoNacoes } = await mod();
  const data = await fetchCatalogoNacoes(
    fakeFetch({
      loja: "nacoes",
      geradoEm: "2026-10-31T17:56:16",
      itens: [
        { nome: "A", lab: "X", categoria: "Perfumaria e higiene", preco: 10, isMIP: false, estoque: 99 },
        { nome: "", categoria: "Perfumaria e higiene", preco: 10 },
        { nome: "B", categoria: "Perfumaria e higiene", preco: 0 },
      ],
    }),
  );
  assert.equal(data.itens.length, 1);
  assert.deepEqual(Object.keys(data.itens[0]).sort(), ["categoria", "isMIP", "lab", "nome", "preco"]);
});

test("catálogo Nações: erro de rede ou resposta ruim vira null", async () => {
  const { fetchCatalogoNacoes } = await mod();
  assert.equal(await fetchCatalogoNacoes(fakeFetch({}, false)), null);
  assert.equal(await fetchCatalogoNacoes(fakeFetch({ foo: 1 })), null);
  assert.equal(await fetchCatalogoNacoes(async () => { throw new Error("x"); }), null);
});

test("catálogo Nações: agrupa na ordem das categorias e ordena por nome", async () => {
  const { groupByCategoria } = await mod();
  const g = groupByCategoria([
    { nome: "Z", lab: "", categoria: "Medicamentos isentos de prescrição", preco: 1, isMIP: true },
    { nome: "b", lab: "", categoria: "Perfumaria e higiene", preco: 1, isMIP: false },
    { nome: "a", lab: "", categoria: "Perfumaria e higiene", preco: 1, isMIP: false },
  ]);
  assert.deepEqual(g.map((x) => x.categoria), ["Perfumaria e higiene", "Medicamentos isentos de prescrição"]);
  assert.deepEqual(g[0].itens.map((i) => i.nome), ["a", "b"]);
});

test("página de produtos da Nações: canonical relativo, noindex, avisos Anvisa e WhatsApp rastreado", async () => {
  const page = await read("app/nacoes-unidas/produtos/page.tsx");
  assert.ok(page.includes("canonical: `/${SLUG}`"));
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /COMPANY\.anvisaWarnings/);
  assert.match(page, /data-track-event="whatsapp_click"/);
  assert.match(page, /buildWhatsAppUrl/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
});

test("fotos Nações: só EANs aprovados, arquivo existe e item sem foto devolve null", async () => {
  const { fotoDoProduto, FOTOS_NACOES } = await import("../app/nacoes-unidas/produtos/imagens.ts");
  const { access } = await import("node:fs/promises");
  for (const ean of Object.values(FOTOS_NACOES)) await access(new URL(`../public/produtos/${ean}.webp`, import.meta.url));
  assert.equal(Object.keys(FOTOS_NACOES).length, 20);
  assert.equal(fotoDoProduto("DES REXONA COTTON DRY 150 ML"), "/produtos/7791293032467.webp");
  assert.equal(fotoDoProduto("  DES REXONA   COTTON DRY 150 ML "), "/produtos/7791293032467.webp");
  assert.equal(fotoDoProduto("PROT LABIAL NIVEA FRUIT"), null);
  assert.equal(fotoDoProduto("DIPIRONA 1G cx 10cpr PRATI DONADUZZI"), null);
});
