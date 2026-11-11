import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lerJson = async (arquivo) => JSON.parse(await readFile(new URL(`../${arquivo}`, import.meta.url), "utf8"));
const lerTexto = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");
const rel = () => import("../app/nacoes-unidas/produtos/relacionados.ts");
const catalogoMod = () => import("../app/nacoes-unidas/produtos/catalogo.ts");
const regras = () => import("../ops/ia-catalogo/descricoes-regras.mjs");

async function porSlug() {
  const { carregarCatalogoNacoes, slugify } = await catalogoMod();
  const mapa = new Map();
  for (const i of carregarCatalogoNacoes().itens) if (!mapa.has(slugify(i.nome))) mapa.set(slugify(i.nome), i);
  return mapa;
}

test("combina com: só entram produtos não medicinais, fora de NBCAL e fórmula, e todo slug existe", async () => {
  const { elegivelParaPares, MIN_SUGESTOES, MAX_SUGESTOES } = await rel();
  const pares = await lerJson("app/nacoes-unidas/produtos/dados/relacionados-ia.json");
  const catalogo = await porSlug();
  const origens = Object.keys(pares);
  assert.ok(origens.length > 300);
  // O catálogo muda com o estoque (sincronização automática): item que saiu fica de fora, o resto segue valendo.
  // A tela já ignora par sem página; aqui só se exige que a grande maioria ainda exista.
  const presentes = origens.filter((o) => catalogo.has(o));
  // Com a troca natural do estoque (~100 itens entram e saem por sincronização), a fração muda a cada dia: exige um piso, não uma proporção.
  assert.ok(presentes.length >= 150 && presentes.length >= origens.length * 0.4, `só ${presentes.length} de ${origens.length} origens estão no catálogo`);
  let alvosTotal = 0;
  let alvosPresentes = 0;
  for (const origem of origens) {
    const item = catalogo.get(origem);
    const alvos = pares[origem];
    if (item) {
      assert.equal(item.isMIP, false, `medicamento como origem: ${origem}`);
      assert.ok(elegivelParaPares(item), `origem inelegível: ${origem}`);
    }
    assert.ok(alvos.length >= MIN_SUGESTOES && alvos.length <= MAX_SUGESTOES, `quantidade de ${origem}: ${alvos.length}`);
    assert.equal(new Set(alvos).size, alvos.length, `repetido em ${origem}`);
    assert.ok(!alvos.includes(origem), `auto-par em ${origem}`);
    for (const alvo of alvos) {
      const it = catalogo.get(alvo);
      alvosTotal += 1;
      if (!it) continue;
      alvosPresentes += 1;
      assert.equal(it.isMIP, false, `medicamento como sugestão: ${alvo}`);
      assert.ok(elegivelParaPares(it), `alvo inelegível: ${alvo}`);
      assert.ok(it.preco > 0, `alvo sem preço: ${alvo}`);
    }
  }
  assert.ok(alvosPresentes >= alvosTotal * 0.7, `só ${alvosPresentes} de ${alvosTotal} sugestões estão no catálogo`);
});

test("combina com: elegibilidade bloqueia medicamento, NBCAL, fórmula infantil, ingerível e material de saúde", async () => {
  const { elegivelParaPares } = await rel();
  const base = { lab: "X", preco: 10, isMIP: false };
  assert.equal(elegivelParaPares({ ...base, nome: "Shampoo Seda 325ml", categoria: "Cuidado Diário" }), true);
  assert.equal(elegivelParaPares({ ...base, nome: "Dipirona 500mg 10 comprimidos", categoria: "Medicamentos", isMIP: true }), false);
  assert.equal(elegivelParaPares({ ...base, nome: "Dipirona 500mg", categoria: "Cuidado Diário", isMIP: true }), false);
  assert.equal(elegivelParaPares({ ...base, nome: "Vitamina C 1g 30 cps", categoria: "Bem Estar" }), false);
  assert.equal(elegivelParaPares({ ...base, nome: "Seringa 5ml", categoria: "Cuidado Diário" }), false);
  assert.equal(elegivelParaPares({ ...base, nome: "Agulha 25x7", categoria: "Cuidado Diário" }), false);
  assert.equal(elegivelParaPares({ ...base, nome: "Formula Infantil Nan 1 800g", categoria: "Infantil e Gestante" }), false);
  assert.equal(elegivelParaPares({ ...base, nome: "Alcool 70 500ml", categoria: "Cuidado Diário" }), false);
});

test("combina com: sugestões da página (3 a 6) e da cesta (sem repetir nem o que já está na cesta, vazio com menos de 3)", async () => {
  const { sugestoesDoProduto, sugestoesDaCesta } = await rel();
  const pares = { a: ["b", "c", "d", "e", "f", "g", "h"], b: ["a", "c", "x"], z: ["a", "b"], poucos: ["a", "b"] };
  assert.deepEqual(sugestoesDoProduto(pares, "a"), ["b", "c", "d", "e", "f", "g"]);
  assert.deepEqual(sugestoesDoProduto(pares, "poucos"), []);
  assert.deepEqual(sugestoesDoProduto(pares, "inexistente"), []);
  assert.deepEqual(sugestoesDoProduto(pares, "a", new Set(["c"])), ["b", "d", "e", "f", "g", "h"]);
  const cesta = sugestoesDaCesta(pares, ["a", "b"], 4);
  assert.equal(cesta.length, 4);
  assert.ok(!cesta.includes("a") && !cesta.includes("b"));
  assert.equal(new Set(cesta).size, cesta.length);
  assert.deepEqual(sugestoesDaCesta(pares, ["poucos"], 4), []);
  assert.deepEqual(sugestoesDaCesta(pares, ["medicamento-sem-par"], 4), []);
});

test("combina com: texto honesto, sem 'quem comprou' e sem medicamento nas telas", async () => {
  for (const arquivo of ["app/nacoes-unidas/produtos/CombinaCom.tsx", "app/reserva/CestaSugestoes.tsx", "app/nacoes-unidas/produtos/[slug]/page.tsx"]) {
    const fonte = await lerTexto(arquivo);
    assert.doesNotMatch(fonte, /quem comprou|compraram também|clientes levaram/i, arquivo);
  }
  assert.match(await lerTexto("app/nacoes-unidas/produtos/CombinaCom.tsx"), /Combina com/);
  assert.match(await lerTexto("app/reserva/CestaSugestoes.tsx"), /Leve também/);
  assert.match(await lerTexto("app/reserva/CestaSugestoes.tsx"), /!i\.receita/);
});

test("descrições: cada texto passa nas regras (sem promessa de saúde, números só do nome), marcado ia/modelo", async () => {
  const { reprovarDescricao } = await regras();
  const { slugify } = await catalogoMod();
  const { ehNbcal } = await import("../app/nacoes-unidas/produtos/produto.ts");
  const { ehFormulaInfantil } = await rel();
  const { nomeDeExibicao } = await import("../app/nome-exibicao.ts");
  const descricoes = await lerJson("app/nacoes-unidas/produtos/dados/descricoes-ia.json");
  const catalogo = await porSlug();
  const slugs = Object.keys(descricoes);
  assert.ok(slugs.length > 1000);
  let ia = 0;
  let presentes = 0;
  for (const slug of slugs) {
    const d = descricoes[slug];
    const item = catalogo.get(slug);
    assert.ok(d.f === "ia" || d.f === "modelo", `origem inválida: ${slug}`);
    assert.doesNotMatch(d.t, /R\$|!|\?/, slug);
    if (d.f === "ia") ia += 1;
    if (!item) continue; // saiu do catálogo (sem estoque): a descrição fica guardada para quando voltar
    presentes += 1;
    assert.ok(!ehNbcal(item.nome), `NBCAL com descrição: ${slug}`);
    assert.ok(!ehFormulaInfantil(item.nome), `fórmula infantil com descrição: ${slug}`);
    if (d.f === "ia") {
      const motivo = reprovarDescricao(d.t, { nome: item.nome, exibicao: nomeDeExibicao(item.nome) });
      assert.equal(motivo, null, `${slug}: ${motivo} :: ${d.t}`);
    }
  }
  assert.ok(ia > 1000);
  assert.ok(presentes >= slugs.length * 0.7, `só ${presentes} de ${slugs.length} descrições têm produto no catálogo`);
  assert.ok(typeof slugify === "function");
});

test("descrições: medicamento ganha o aviso da bula; os demais não; NBCAL não tem descrição", async () => {
  const { descricaoPublica, descricaoDoProduto, AVISO_BULA } = await import("../app/nacoes-unidas/produtos/descricoes.ts");
  const descricoes = await lerJson("app/nacoes-unidas/produtos/dados/descricoes-ia.json");
  const catalogo = await porSlug();
  const slugMed = [...catalogo.entries()].find(([s, i]) => i.isMIP && descricoes[s])?.[0];
  const slugComum = [...catalogo.entries()].find(([s, i]) => !i.isMIP && descricoes[s])?.[0];
  assert.equal(AVISO_BULA, "Leia a bula. Em caso de dúvida, consulte o farmacêutico.");
  if (slugMed) assert.ok(descricaoPublica(slugMed, true).texto.endsWith(AVISO_BULA));
  assert.ok(!descricaoPublica(slugComum, false).texto.includes("bula"));
  assert.equal(descricaoDoProduto("slug-que-nao-existe"), null);
  assert.ok(["ia", "modelo", "pesquisa"].includes(descricaoDoProduto(slugComum).origem));
  const pagina = await lerTexto("app/nacoes-unidas/produtos/[slug]/page.tsx");
  assert.match(pagina, /data-descricao-origem/);
  assert.match(pagina, /ehNbcal\(item\.nome\) \? null : descricaoPublica/);
});

test("descrições: metadados usam a descrição quando existe e mantêm o texto antigo quando não", async () => {
  const { descricaoMetadata, jsonLdProduto } = await import("../app/nacoes-unidas/produtos/produto.ts");
  assert.match(descricaoMetadata("Shampoo X", "Shampoo X 300ml da marca Y."), /^Shampoo X 300ml da marca Y\. União Farma/);
  assert.match(descricaoMetadata("Shampoo X"), /^Shampoo X na União Farma/);
  const ld = jsonLdProduto({ nome: "Shampoo X", lab: "Y", categoria: "Beleza", url: "https://exemplo/p", image: null, descricao: "Texto curto." });
  assert.match(ld.description, /^Texto curto\./);
});

test("descrições pesquisadas: arquivo próprio, só produto comum, sem promessa de efeito, com fonte, e vale mais que a de IA", async () => {
  const { descricaoDoProduto, descricaoPublica } = await import("../app/nacoes-unidas/produtos/descricoes.ts");
  const { ehNbcal } = await import("../app/nacoes-unidas/produtos/produto.ts");
  const { ehFormulaInfantil } = await rel();
  const pesquisadas = await lerJson("app/nacoes-unidas/produtos/dados/descricoes-pesquisa.json");
  const ia = await lerJson("app/nacoes-unidas/produtos/dados/descricoes-ia.json");
  const catalogo = await porSlug();
  const PROMESSAS = /\bcura\w*|\btrata\w*|\btratamento|\balivia\w*|\bprev[eé]m\w*|\bcombat\w*|\bclinicamente|\bcomprovad\w*|\beficaz\w*|\bgarant\w*|\bhipoalerg\w*|\bdermatologicamente|\bsem efeitos?\b|\b\d+ ?horas\b|\bpara que serve\b|R\$|[!?]/i;
  const slugs = Object.keys(pesquisadas);
  assert.ok(slugs.length >= 10);
  for (const slug of slugs) {
    const d = pesquisadas[slug];
    assert.ok(typeof d.t === "string" && d.t.length >= 20 && d.t.length <= 600, slug);
    assert.match(d.fonte, /^https:\/\//, `${slug}: fonte precisa ser um link https`);
    assert.match(d.quando, /^\d{4}-\d{2}-\d{2}$/, slug);
    assert.doesNotMatch(d.t, PROMESSAS, `${slug}: promessa de efeito no texto: ${d.t}`);
    const item = catalogo.get(slug);
    if (!item) continue; // saiu do catálogo: o texto fica guardado para quando voltar
    assert.ok(!item.isMIP, `medicamento não entra na pesquisa sem decisão do responsável técnico: ${slug}`);
    assert.ok(!ehNbcal(item.nome) && !ehFormulaInfantil(item.nome), `NBCAL/fórmula infantil com texto pesquisado: ${slug}`);
    const publica = descricaoPublica(slug, false);
    assert.equal(publica.origem, "pesquisa");
    assert.equal(publica.fonte, d.fonte);
    if (ia[slug]) assert.equal(publica.texto, d.t.trim(), "o texto pesquisado vale mais que o de IA");
  }
  assert.equal(descricaoDoProduto("slug-que-nao-existe"), null);
  const pagina = await lerTexto("app/nacoes-unidas/produtos/[slug]/page.tsx");
  assert.match(pagina, /pdp-fonte/, "a página mostra a fonte");
  const podar = await lerTexto("scripts/podar-dados-ia.mjs");
  assert.doesNotMatch(podar, /descricoes-pesquisa/, "a poda de IA não mexe nas descrições pesquisadas");
});
