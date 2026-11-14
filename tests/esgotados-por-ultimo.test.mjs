import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const busca = () => import("../app/nacoes-unidas/produtos/busca.ts");
const catalogo = () => import("../app/nacoes-unidas/produtos/catalogo.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const json = (a) => ler(a).then((t) => JSON.parse(t));

const item = (nome, extra = {}) => ({
  nome,
  lab: "L",
  precoFmt: extra.precoFmt ?? "R$ 10,00",
  preco: extra.preco ?? 10,
  isMIP: false,
  foto: null,
  ...extra,
});

const nomes = (grupos) => grupos.flatMap((g) => g.itens.map((i) => i.nome));

function primeiroEsgotadoDepoisDosDisponiveis(lista) {
  const flags = lista.map((i) => i.esgotado === true);
  const firstEsg = flags.indexOf(true);
  const lastDisp = flags.lastIndexOf(false);
  return firstEsg === -1 || lastDisp === -1 || firstEsg > lastDisp;
}

test("esgotadosPorUltimo: disponíveis primeiro, ordem estável entre iguais", async () => {
  const { esgotadosPorUltimo } = await busca();
  const entrada = [
    item("A"),
    item("B", { esgotado: true }),
    item("C"),
    item("D", { esgotado: true }),
    item("E"),
  ];
  assert.deepEqual(
    esgotadosPorUltimo(entrada).map((i) => i.nome),
    ["A", "C", "E", "B", "D"],
  );
  assert.deepEqual(
    esgotadosPorUltimo(entrada.filter((i) => i.esgotado !== true)).map((i) => i.nome),
    ["A", "C", "E"],
  );
});

test("aplicarCatalogo: esgotados no fim em qualquer ordem, filtro e página", async () => {
  const { aplicarCatalogo, esgotadosPorUltimo, gruposComEsgotadosPorUltimo } = await busca();
  const grupos = [
    {
      categoria: "Beleza",
      id: "beleza",
      itens: [
        item("Creme disponível", { preco: 40, precoFmt: "R$ 40,00" }),
        item("Creme esgotado barato", { preco: 5, precoFmt: "R$ 5,00", esgotado: true }),
        item("Batom disponível", { preco: 15, precoFmt: "R$ 15,00" }),
      ],
    },
    {
      categoria: "Cuidado Diário",
      id: "cuidado-diario",
      itens: [
        item("Sabonete disponível", { preco: 8, precoFmt: "R$ 8,00" }),
        item("Shampoo esgotado", { preco: 50, precoFmt: "R$ 50,00", esgotado: true }),
      ],
    },
  ];

  // Recomendados: todos os disponíveis (na ordem dos grupos) e só depois os esgotados.
  assert.deepEqual(nomes(aplicarCatalogo(grupos, { ordem: "recomendados" })), [
    "Creme disponível",
    "Batom disponível",
    "Sabonete disponível",
    "Creme esgotado barato",
    "Shampoo esgotado",
  ]);

  // Menor preço: o esgotado mais barato não fura a fila.
  const menor = nomes(aplicarCatalogo(grupos, { ordem: "menor_preco" }));
  assert.deepEqual(menor, [
    "Sabonete disponível",
    "Batom disponível",
    "Creme disponível",
    "Creme esgotado barato",
    "Shampoo esgotado",
  ]);

  // Maior preço: o esgotado mais caro também fica no fim.
  const maior = nomes(aplicarCatalogo(grupos, { ordem: "maior_preco" }));
  assert.deepEqual(maior, [
    "Creme disponível",
    "Batom disponível",
    "Sabonete disponível",
    "Shampoo esgotado",
    "Creme esgotado barato",
  ]);

  // Com filtro de busca, a ordem relativa se mantém e o esgotado segue no fim.
  assert.deepEqual(nomes(aplicarCatalogo(grupos, { consulta: "creme", ordem: "recomendados" })), [
    "Creme disponível",
    "Creme esgotado barato",
  ]);
  assert.deepEqual(nomes(aplicarCatalogo(grupos, { consulta: "creme", ordem: "menor_preco" })), [
    "Creme disponível",
    "Creme esgotado barato",
  ]);

  // Paginação global: a primeira página só tem disponíveis se ainda houver estoque suficiente.
  const todos = esgotadosPorUltimo(aplicarCatalogo(grupos, { ordem: "recomendados" }).flatMap((g) => g.itens));
  const porPagina = 2;
  const pagina1 = todos.slice(0, porPagina);
  const ultima = todos.slice(porPagina * Math.ceil(todos.length / porPagina) - porPagina);
  assert.ok(pagina1.every((i) => i.esgotado !== true));
  assert.ok(ultima.some((i) => i.esgotado === true));
  assert.ok(primeiroEsgotadoDepoisDosDisponiveis(todos));

  const reagrupados = gruposComEsgotadosPorUltimo(grupos);
  assert.ok(primeiroEsgotadoDepoisDosDisponiveis(reagrupados.flatMap((g) => g.itens)));
});

test("sugerirProdutos: preenche com disponíveis e só então mostra esgotados", async () => {
  const { sugerirProdutos } = await busca();
  const grupos = [
    {
      categoria: "Beleza",
      id: "beleza",
      itens: [item("Creme esgotado", { esgotado: true }), item("Creme disponível"), item("Creme extra")],
    },
  ];
  assert.deepEqual(
    sugerirProdutos(grupos, "creme", 2).map((i) => i.nome),
    ["Creme disponível", "Creme extra"],
  );
  assert.deepEqual(
    sugerirProdutos(grupos, "creme", 8).map((i) => i.nome),
    ["Creme disponível", "Creme extra", "Creme esgotado"],
  );
});

test("groupByCategoria e arquivos gerados: esgotados no fim de cada lista", async () => {
  const { groupByCategoria } = await catalogo();
  const grupos = groupByCategoria([
    { nome: "Zebra", lab: "", categoria: "Beleza", preco: 1, isMIP: false, esgotado: true },
    { nome: "Beta", lab: "", categoria: "Beleza", preco: 1, isMIP: false },
    { nome: "Alfa", lab: "", categoria: "Beleza", preco: 1, isMIP: false, esgotado: true },
  ]);
  assert.deepEqual(
    grupos[0].itens.map((i) => i.nome),
    ["Beta", "Alfa", "Zebra"],
  );

  const raiz = new URL("../public/dados/nacoes/catalogo/", import.meta.url);
  for (const cat of await readdir(raiz)) {
    const dir = new URL(`./${cat}/`, raiz);
    const arquivos = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
    const itens = (await Promise.all(arquivos.map((f) => json(`public/dados/nacoes/catalogo/${cat}/${f}`)))).flat();
    assert.ok(primeiroEsgotadoDepoisDosDisponiveis(itens), cat);
  }

  const indice = await json("public/dados/nacoes/busca-index.json");
  for (const g of indice.grupos) {
    assert.ok(primeiroEsgotadoDepoisDosDisponiveis(g.itens), g.slug);
  }
  assert.ok(primeiroEsgotadoDepoisDosDisponiveis(indice.restritos), "restritos");

  const lista = await ler("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(lista, /esgotadosPorUltimo\(visiveis\.flatMap/);
  const gen = await ler("scripts/gerar-assets-catalogo.mjs");
  assert.match(gen, /Number\(a\.esgotado === true\) - Number\(b\.esgotado === true\)/);
});
