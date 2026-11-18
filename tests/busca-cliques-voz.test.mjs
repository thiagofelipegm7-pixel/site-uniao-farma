import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const C = await import("../app/busca-cliques.ts");
const V = await import("../app/shop/busca-voz.ts");
const R = await import("../app/nacoes-unidas/produtos/relevancia.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("cliques: o reforço é pequeno, cresce devagar e tem teto", () => {
  assert.equal(C.reforcoPorCliques(0), 0);
  assert.equal(C.reforcoPorCliques(1), 0, "um clique só não conta");
  assert.ok(C.reforcoPorCliques(2) > 0);
  assert.ok(C.reforcoPorCliques(10) > C.reforcoPorCliques(2));
  assert.equal(C.reforcoPorCliques(100000), C.MAX_REFORCO);
  assert.equal(C.reforcoPorCliques(Number.NaN), 0);
});

test("cliques: só guarda termo comum e endereço de produto válido", () => {
  assert.equal(C.slugParaRegistro("sabonete-dove-90g"), "sabonete-dove-90g");
  for (const ruim of ["", "ab", "Sabonete Dove", "../x", "a/b", "x".repeat(150), 5, null]) assert.equal(C.slugParaRegistro(ruim), null, String(ruim));
  assert.equal(C.termoParaRegistro("pilula do dia seguinte"), null);
  assert.equal(C.termoParaRegistro("Protetor Solar"), "protetor solar");
});

test("cliques: o mapa só traz termo e produto que repetiram, os mais abertos primeiro", () => {
  const mapa = C.montarMapa([
    { termo: "sabonete", slug: "sabonete-dove", n: 6 },
    { termo: "sabonete", slug: "sabonete-lux", n: 2 },
    { termo: "sabonete", slug: "sabonete-raro", n: 1 },
    { termo: "fralda", slug: "fralda-x", n: 2 },
    { termo: "hiv", slug: "teste-x", n: 9 },
    { termo: "shampoo", slug: "Slug Ruim", n: 9 },
  ]);
  assert.deepEqual(Object.keys(mapa), ["sabonete"], "fralda tem poucos cliques no total; hiv é sensível; slug inválido cai");
  assert.deepEqual(Object.keys(mapa.sabonete), ["sabonete-dove", "sabonete-lux"]);
});

test("cliques: o banco soma por dia e limita o que um dia pode somar", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return { bind: (...v) => ({
        async run() { if (sql.startsWith("INSERT")) { const k = v.slice(0, 3).join("|"); linhas.set(k, Math.min((linhas.get(k) ?? 0) + 1, C.MAX_POR_DIA)); } },
        async all() { return { results: [...linhas].map(([k, n]) => { const [termo, slug] = k.split("|"); return { termo, slug, n }; }) }; },
      }) };
    },
  };
  for (let i = 0; i < 50; i += 1) await C.registrarClique(db, "sabonete", "sabonete-dove", "2026-11-18", false);
  await C.registrarClique(db, "sabonete", "sabonete-lux", "2026-11-18", false);
  const mapa = await C.cliquesPorTermo(db, "2026-11-18");
  assert.equal(mapa.sabonete["sabonete-dove"], C.MAX_POR_DIA, "50 cliques de um dia valem no máximo o teto diário");
  assert.equal(mapa.sabonete["sabonete-lux"], undefined, "um clique só não aparece");
});

const item = (nome, extra = {}) => ({ nome, lab: "", precoFmt: "R$ 10,00", isMIP: false, foto: "/f.webp", slug: nome.toLowerCase().replace(/ /g, "-"), ...extra });

test("relevância com cliques: o mais aberto sobe entre iguais, mas esgotado e remédio ficam como estavam", () => {
  const grupos = [
    { categoria: "Cuidado Diário", id: "a", itens: [item("Sabonete Lux 90g"), item("Sabonete Dove 90g"), item("Sabonete Esgotado 90g", { esgotado: true })] },
    { categoria: "Medicamentos", id: "m", itens: [item("Sabonete Medicamentoso 90g")] },
  ];
  const slugDe = (i) => i.slug;
  const sem = R.ordenarPorRelevancia(grupos, ["sabonete"])[0].itens.map((i) => i.nome);
  assert.equal(sem[0], "Sabonete Lux 90g");
  const com = R.ordenarPorRelevancia(grupos, ["sabonete"], { "sabonete-dove-90g": 8, "sabonete-esgotado-90g": 50, "sabonete-medicamentoso-90g": 50 }, slugDe)[0].itens.map((i) => i.nome);
  assert.equal(com[0], "Sabonete Dove 90g", "o mais aberto sobe");
  assert.equal(com.at(-1), "Sabonete Esgotado 90g", "esgotado continua no fim mesmo com muitos cliques");
  assert.equal(com.indexOf("Sabonete Medicamentoso 90g"), sem.indexOf("Sabonete Medicamentoso 90g"), "remédio não ganha reforço");
});

test("cliques: a lista só manda clique de produto que não é remédio e a rota é anônima e limitada", async () => {
  const lista = await ler("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(lista, /item\.isMIP \|\| item\.restrito \|\| visiveisBase\.some/);
  assert.match(lista, /\/api\/busca-cliques/);
  const rota = await ler("app/api/busca-cliques/route.ts");
  assert.match(rota, /new URL\(origem\)\.host !== new URL\(request\.url\)\.host/);
  assert.match(rota, /porMinuto/);
  assert.doesNotMatch(rota, /cf-connecting-ip[^;]*(INSERT|bind)/);
  assert.match(rota, /max-age=600/);
});

test("voz: texto falado vira busca limpa e os erros têm mensagem em português", () => {
  assert.equal(V.limparFala("  protetor   solar. "), "protetor solar");
  assert.equal(V.limparFala("fralda!!!"), "fralda");
  assert.equal(V.limparFala("a".repeat(120)).length, 80);
  assert.match(V.mensagemDeErroDeFala("not-allowed"), /microfone/);
  assert.match(V.mensagemDeErroDeFala("no-speech"), /Não ouvi/);
  assert.equal(V.mensagemDeErroDeFala("aborted"), "");
  assert.match(V.mensagemDeErroDeFala("qualquer-coisa"), /Digite/);
});

test("voz: só cria o reconhecimento onde o navegador tem a API", () => {
  assert.equal(V.criarReconhecimento({}), null);
  class Falso {}
  assert.ok(V.criarReconhecimento({ webkitSpeechRecognition: Falso }) instanceof Falso);
  assert.ok(V.criarReconhecimento({ SpeechRecognition: Falso }) instanceof Falso);
});

test("busca no cabeçalho: botão de voz só com suporte, status falado, exemplos sem remédio e sem movimento para quem pede", async () => {
  const f = await ler("app/shop/ShopHeader.tsx");
  assert.match(f, /vozDisponivel \? \(/);
  assert.match(f, /aria-label="Buscar falando" aria-pressed=\{ouvindo\}/);
  assert.match(f, /role="status" aria-live="polite"/);
  assert.match(f, /prefers-reduced-motion: reduce/);
  const lista = f.match(/EXEMPLOS_BUSCA = \[([^\]]+)\]/)?.[1] ?? "";
  assert.ok(lista.includes("fralda"));
  assert.doesNotMatch(lista, /dipirona|paracetamol|ibuprofeno|remedio|remédio/i, "exemplos do campo nunca sugerem medicamento");
  assert.match(f, /exemplo < 0 \? "Buscar na União Farma"/, "a primeira pintura é a frase fixa (sem diferença entre servidor e navegador)");
  const p = await ler("app/privacidade/page.tsx");
  assert.match(p, /busca por voz/i);
  assert.match(p, /anônima/);
});
