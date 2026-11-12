import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const facetas = () => import("../app/nacoes-unidas/produtos/facetas.ts");
const busca = () => import("../app/nacoes-unidas/produtos/busca.ts");

const restrito = (extra) => ({ nome: "X", nomeExibicao: "X", slug: "x", lab: "L", preco: 10, tipo: "receita", ativo: "", tarja: "vermelha", retencao: false, apresentacao: "", aviso: "", controlado: false, generico: false, rms: null, concentracao: null, ...extra });

const grupos = [
  {
    categoria: "Dermocosméticos",
    id: "dermocosmeticos",
    itens: [
      { nome: "Protetor Solar Nivea FPS50 200 ml", lab: "NIVEA", tipo: "Protetores solares", precoFmt: "R$ 50,00", preco: 50, isMIP: false, foto: null },
      { nome: "Protetor Solar Sundown 120ml", lab: "J&J", tipo: "Protetores solares", precoFmt: "R$ 40,00", preco: 40, isMIP: false, foto: null, esgotado: true },
      { nome: "Protetor Solar Nivea facial 40ml", lab: "Nivea", tipo: "Protetores solares", precoFmt: "R$ 30,00", preco: 30, isMIP: false, foto: null },
    ],
  },
  {
    categoria: "Cuidado Diário",
    id: "cuidado-diario",
    itens: [
      { nome: "Protetor Labial Nivea", lab: "NIVEA", tipo: "Lábios e rosto", precoFmt: "R$ 12,00", preco: 12, isMIP: false, foto: null },
      { nome: "Protetor Diario Intimus 40UND", lab: "KIMBERLY", tipo: "Absorventes", precoFmt: "R$ 9,00", preco: 9, isMIP: false, foto: null },
    ],
  },
];

const medicamentos = [
  {
    categoria: "Medicamentos",
    id: "medicamentos",
    itens: [
      { nome: "Dipirona 500mg Cx 10 comprimidos", lab: "MEDLEY", tipo: "Outros", precoFmt: "R$ 5,00", preco: 5, isMIP: true, foto: null },
      { nome: "Dipirona 500MG/ML gotas 20ml", lab: "EMS", tipo: "Outros", precoFmt: "R$ 8,00", preco: 8, isMIP: true, foto: null },
    ],
  },
  {
    categoria: "Medicamentos",
    id: "restritos",
    itens: [
      { nome: "Atenolol 25mg Cx 30 comprimidos", lab: "BIOLAB", precoFmt: "R$ 7,00", preco: 7, isMIP: false, foto: null, restrito: restrito({ ativo: "atenolol", generico: true }) },
      { nome: "Clonazepam 2mg Cx 30 comprimidos", lab: "EMS", precoFmt: "R$ 9,00", preco: 9, isMIP: false, foto: null, restrito: restrito({ ativo: "clonazepam", tipo: "controlados", controlado: true }) },
    ],
  },
];

const porId = (lista) => Object.fromEntries(lista.map((f) => [f.id, Object.fromEntries(f.opcoes.map((o) => [o.label, o.contagem]))]));

test("facetas: saem dos produtos da busca, com contagem, e somem quando têm menos de 2 opções", async () => {
  const { calcularFacetas } = await facetas();
  const f = porId(calcularFacetas(grupos, { selecoes: {} }));
  assert.deepEqual(f.departamento, { "Dermocosméticos": 3, "Cuidado Diário": 2 });
  // "Nivea" e "NIVEA" são a mesma marca: soma, com a grafia mais comum.
  assert.deepEqual(f.marca, { NIVEA: 3, "J&J": 1, KIMBERLY: 1 });
  assert.deepEqual(f.disponibilidade, { "Disponíveis": 4, Esgotados: 1 });
  assert.equal(f.tamanho["200 ml"], 1);
  // Seções de medicamento não aparecem numa lista que não é só de Medicamentos.
  for (const id of ["venda", "generico", "ativo", "forma", "dosagem"]) assert.equal(f[id], undefined, id);

  const so1 = porId(calcularFacetas([grupos[0]], { selecoes: {} }));
  assert.equal(so1.departamento, undefined, "um departamento só: a seção some");
  assert.equal(so1.categoria, undefined, "uma categoria só: a seção some");
});

test("facetas: cada seção conta com os OUTROS filtros aplicados (padrão de loja)", async () => {
  const { calcularFacetas, predicadoFiltros } = await facetas();
  const { aplicarCatalogo, contarItens } = await busca();
  const filtros = { selecoes: { marca: ["nivea"] } };
  const f = porId(calcularFacetas(grupos, filtros));
  // A marca continua mostrando as outras marcas (para trocar ou somar)…
  assert.deepEqual(f.marca, { NIVEA: 3, "J&J": 1, KIMBERLY: 1 });
  // …e o departamento passa a contar só Nivea.
  assert.deepEqual(f.departamento, { "Dermocosméticos": 2, "Cuidado Diário": 1 });
  assert.equal(contarItens(aplicarCatalogo(grupos, { predicado: predicadoFiltros(filtros) })), 3);
  // Opção com zero some; a marcada fica, mesmo zerada, para poder desmarcar.
  const g = calcularFacetas(grupos, { selecoes: { departamento: ["Cuidado Diário"], marca: ["J&J"] } });
  const marca = g.find((x) => x.id === "marca");
  assert.ok(marca.opcoes.find((o) => o.label === "J&J").selecionada);
  assert.equal(marca.opcoes.some((o) => o.contagem === 0 && !o.selecionada), false);
});

test("facetas: preço mínimo e máximo (inclusive), validação e faixa dos resultados", async () => {
  const { predicadoFiltros, validarFaixa, lerPrecoDigitado, faixaDePrecos } = await facetas();
  const { aplicarCatalogo } = await busca();
  const precos = (f) => aplicarCatalogo(grupos, { predicado: predicadoFiltros(f) }).flatMap((g) => g.itens.map((i) => i.preco)).sort((a, b) => a - b);
  assert.deepEqual(precos({ selecoes: {}, precoMin: 12, precoMax: 40 }), [12, 30, 40]);
  assert.deepEqual(precos({ selecoes: {}, precoMax: 10 }), [9]);
  assert.equal(lerPrecoDigitado("10,50"), 10.5);
  assert.equal(lerPrecoDigitado("R$ 12"), 12);
  assert.equal(lerPrecoDigitado(""), undefined);
  assert.ok(Number.isNaN(lerPrecoDigitado("dez")));
  assert.deepEqual(validarFaixa("10", ""), { ok: true, min: 10, max: undefined });
  assert.equal(validarFaixa("50", "10").ok, false);
  assert.equal(validarFaixa("-3", "").ok, false);
  assert.deepEqual(faixaDePrecos(grupos, { selecoes: {} }), { min: 9, max: 50 });
  // Sem preço ("Consulte") fica fora quando há faixa.
  const semPreco = [{ categoria: "A", id: "a", itens: [{ nome: "Sem preço", lab: "", precoFmt: "Consulte", isMIP: false, foto: null }] }];
  assert.equal(aplicarCatalogo(semPreco, { predicado: predicadoFiltros({ selecoes: {}, precoMax: 100 }) }).length, 0);
});

test("facetas de medicamento: tipo de venda, genérico e princípio ativo vêm dos campos; forma e dose só do que o nome diz", async () => {
  const { calcularFacetas } = await facetas();
  const f = porId(calcularFacetas(medicamentos, { selecoes: {} }));
  assert.deepEqual(Object.keys(f.venda), ["Sem receita", "Com receita", "Controlado"], "ordem neutra: sem receita primeiro");
  assert.deepEqual(f.generico, { "Genérico": 1, "Não genérico": 1 });
  assert.deepEqual(f.ativo, { Atenolol: 1, Clonazepam: 1 });
  assert.deepEqual(f.forma, { Comprimido: 3, Gotas: 1 });
  assert.deepEqual(f.dosagem, { "2 mg": 1, "25 mg": 1, "500 mg": 1, "500 mg/ml": 1 });
  assert.equal(f.departamento, undefined, "dois grupos 'Medicamentos' contam como um departamento");
});

test("leitura do nome: só com a unidade escrita, sem adivinhar em kits, associações ou números ambíguos", async () => {
  const { dosagemDoNome, formaDoNome, tamanhoDoNome, quantidadeContadaDoNome } = await facetas();
  assert.equal(dosagemDoNome("Amoxicilina 400MG/5ML Susp 100ml"), "400 mg/5ml");
  assert.equal(dosagemDoNome("Minoxidil 5% Sol Spray 50ml"), "5%");
  assert.equal(dosagemDoNome("Nordette 0.15+0.03MG Cx 21 drágeas"), null);
  assert.equal(dosagemDoNome("Amicored 2.500MCG/ML Sol Inj"), null);
  assert.equal(dosagemDoNome("Biolagrima 010% 15ml"), null);
  assert.equal(dosagemDoNome("Dipirona 1g Cx 10 comprimidos"), null, "1g pode ser dose ou peso: sem valor");
  assert.equal(formaDoNome("Fenobarbital 40mg gotas 20ml"), "Gotas");
  assert.equal(formaDoNome("Minoxidil Sol Spray Creme"), null, "duas formas: sem valor");
  assert.equal(tamanhoDoNome("Amoxicilina 400MG/5ML Susp 100ml"), "100 ml");
  assert.equal(tamanhoDoNome("Protetor Solar facial Sunless 060g F50"), "60 g");
  assert.equal(tamanhoDoNome("Kit Seda Shampoo 300ML+COND 190ml"), null);
  assert.equal(tamanhoDoNome("Protetor Labial Nivea Essential"), null);
  assert.equal(quantidadeContadaDoNome("Dipirona 1g Cx 10 comprimidos"), "10 comprimidos");
  assert.equal(quantidadeContadaDoNome("Protetor Solar 200 ml"), null);
});

test("endereço: filtros vão e voltam pela URL, mantendo ?q= e tirando ?pagina=", async () => {
  const { filtrosDaUrl, urlComFiltros, assinaturaFiltros } = await facetas();
  const estado = { selecoes: { marca: ["NIVEA", "J&J"], departamento: ["Cuidado Diário"] }, precoMin: 10, precoMax: 49.9, ordem: "menor_preco" };
  const url = urlComFiltros("https://uniaofarma.example/nacoes-unidas/produtos?q=protetor&pagina=3", estado);
  const u = new URL(url);
  assert.equal(u.searchParams.get("q"), "protetor");
  assert.equal(u.searchParams.has("pagina"), false);
  assert.deepEqual(u.searchParams.getAll("marca"), ["NIVEA", "J&J"]);
  assert.equal(u.searchParams.get("preco_max"), "49.9");
  const lido = filtrosDaUrl(u.search);
  assert.deepEqual(lido, estado);
  assert.equal(assinaturaFiltros(lido), assinaturaFiltros(estado));
  // Ida e volta sem filtros: endereço limpo, ordem padrão fora da URL.
  const limpo = new URL(urlComFiltros(url, { selecoes: {}, ordem: "recomendados" }));
  assert.equal(limpo.search, "?q=protetor");
  // Lixo na URL não quebra: ordem inválida, preço que não é número, mínimo maior que máximo.
  assert.deepEqual(filtrosDaUrl("?ordem=hack&preco_min=abc&preco_max=5&marca=&tamanho=%20200%20ml%20"), { selecoes: { tamanho: ["200 ml"] }, precoMax: 5, ordem: "recomendados" });
  assert.deepEqual(filtrosDaUrl("?preco_min=50&preco_max=10"), { selecoes: {}, precoMin: 10, precoMax: 50, ordem: "recomendados" });
});

test("lista: lateral com facetas da busca, URL sincronizada, chips e gaveta com 'Ver N produtos'", async () => {
  const lista = await readFile(new URL("../app/nacoes-unidas/produtos/CatalogoLista.tsx", import.meta.url), "utf8");
  assert.match(lista, /calcularFacetas\(porTexto, filtros\)/);
  assert.match(lista, /window\.history\.pushState\(null, "", urlComFiltros/);
  assert.match(lista, /addEventListener\("popstate", ler\)/);
  assert.match(lista, /<FiltrosAtivos/);
  assert.match(lista, /filtrosCampos\("gaveta"\)/);
  assert.match(lista, /Ver \{total\}/);
  const comp = await readFile(new URL("../app/nacoes-unidas/produtos/Facetas.tsx", import.meta.url), "utf8");
  assert.match(comp, /aria-expanded=\{aberta\}/);
  assert.match(comp, /<legend/);
  assert.match(comp, /Aplicar/);
  // Sem estrelas, sem "vendido por", sem preço riscado ou destaque de desconto.
  for (const src of [lista, comp]) assert.doesNotMatch(src, /estrela|avalia[cç]|vendido por|<s>|<del>|line-through|% off/i);
});
