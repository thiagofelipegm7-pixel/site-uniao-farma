import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lerJson = async (arquivo) => JSON.parse(await readFile(new URL(`../${arquivo}`, import.meta.url), "utf8"));
const indiceMod = () => import("../app/nacoes-unidas/produtos/busca-index.ts");
const buscaMod = () => import("../app/nacoes-unidas/produtos/busca.ts");

/** Como a lista montava os grupos antes: todas as fatias do catálogo e dos restritos (cópia fiel do código antigo). */
async function gruposPelasFatias(departamento) {
  const idx = await lerJson("public/dados/nacoes/catalogo-index.json");
  const paraItem = (item) => ({
    nome: item.nomeExibicao || item.nome,
    lab: item.lab,
    isMIP: item.isMIP,
    restam: item.restam,
    esgotado: item.esgotado,
    precoFmt: item.precoFmt,
    preco: item.preco,
    foto: item.foto,
    slug: item.slug,
    tipo: item.tipo,
  });
  const grupos = [];
  for (const g of idx.grupos.filter((g) => !departamento || g.slug === departamento)) {
    const itens = [];
    for (let n = 1; n <= g.paginas; n += 1) itens.push(...(await lerJson(`public/dados/nacoes/catalogo/${g.slug}/p${n}.json`)).map(paraItem));
    grupos.push({ categoria: g.categoria, id: g.slug, itens });
  }
  if (!departamento) {
    const rIdx = await lerJson("public/dados/nacoes/restritos-index.json");
    const restritos = [];
    for (const tipo of ["receita", "controlados"]) {
      for (let n = 1; n <= (rIdx[tipo]?.paginas ?? 0); n += 1) restritos.push(...(await lerJson(`public/dados/nacoes/restritos/${tipo}/p${n}.json`)));
    }
    restritos.sort((a, b) => Number(a.esgotado === true) - Number(b.esgotado === true) || (a.nomeExibicao ?? a.nome).localeCompare(b.nomeExibicao ?? b.nome, "pt-BR"));
    grupos.push({
      categoria: "Medicamentos",
      id: "restritos",
      itens: restritos.map((i) => ({
        nome: i.nomeExibicao ?? i.nome,
        lab: i.lab,
        isMIP: false,
        precoFmt: typeof i.preco === "number" ? `R$ ${i.preco.toFixed(2).replace(".", ",")}` : "Consulte",
        ...(typeof i.preco === "number" ? { preco: i.preco } : {}),
        foto: null,
        slug: i.slug,
        ...(i.esgotado ? { esgotado: true } : {}),
        restrito: i,
      })),
    });
  }
  return grupos;
}

/** O que o cartão mostra e o que a busca/filtro leem. Do restrito, só os campos que o cartão e a ilustração usam. */
function resumo(grupos) {
  const CAMPOS_RESTRITO = ["nome", "nomeExibicao", "slug", "lab", "preco", "tipo", "ativo", "tarja", "retencao", "apresentacao", "controlado", "generico", "restam", "esgotado"];
  return grupos.map((g) => ({
    categoria: g.categoria,
    id: g.id,
    itens: g.itens.map(({ restrito, ...item }) => ({
      ...JSON.parse(JSON.stringify(item)),
      ...(restrito ? { restrito: Object.fromEntries(CAMPOS_RESTRITO.filter((c) => restrito[c] !== undefined).map((c) => [c, restrito[c]])) } : {}),
    })),
  }));
}

test("busca-index.json gera exatamente a mesma lista que a soma das fatias", async () => {
  const { gruposDoIndice } = await indiceMod();
  const indice = await lerJson("public/dados/nacoes/busca-index.json");
  assert.deepEqual(resumo(gruposDoIndice(indice)), resumo(await gruposPelasFatias()));
  for (const dep of ["beleza", "medicamentos", "cuidado-diario"]) {
    assert.deepEqual(resumo(gruposDoIndice(indice, dep)), resumo(await gruposPelasFatias(dep)), dep);
  }
});

test("mesmos resultados para buscas de exemplo (inclui controlado e erro de acento/caixa)", async () => {
  const { gruposDoIndice } = await indiceMod();
  const { aplicarCatalogo, identificarItens } = await buscaMod();
  const novo = identificarItens(gruposDoIndice(await lerJson("public/dados/nacoes/busca-index.json")));
  const antigo = identificarItens(await gruposPelasFatias());
  const chaves = (grupos) => grupos.flatMap((g) => g.itens.map((i) => `${g.id}|${i.id}|${i.nome}|${i.precoFmt}|${i.restrito ? (i.restrito.controlado ? "controlado" : "receita") : "livre"}`));
  const contagens = {};
  for (const consulta of ["minoxidil", "dipirona", "protetor", "fralda", "clonazepam", "RIVOTRIL", "Protetor Solar", "sabonete líquido"]) {
    for (const ordem of ["recomendados", "menor_preco"]) {
      const a = chaves(aplicarCatalogo(antigo, { consulta, ordem }));
      const b = chaves(aplicarCatalogo(novo, { consulta, ordem }));
      assert.deepEqual(b, a, `${consulta} (${ordem})`);
      contagens[consulta] = b.length;
    }
  }
  assert.ok(contagens.minoxidil > 0, "minoxidil acha produtos");
  assert.ok(contagens.clonazepam > 0, "clonazepam (controlado) acha produtos");
  assert.ok(contagens.fralda > 0 && contagens.dipirona > 0 && contagens.protetor > 0);
  assert.equal(chaves(aplicarCatalogo(novo, { consulta: "xyzqwerty" })).length, 0);
});

test("o índice é menor que as fatias e fica em sincronia com a geração", async () => {
  const indice = await lerJson("public/dados/nacoes/busca-index.json");
  const idx = await lerJson("public/dados/nacoes/catalogo-index.json");
  const rIdx = await lerJson("public/dados/nacoes/restritos-index.json");
  assert.equal(indice.geradoEm, idx.geradoEm, "busca-index.json precisa sair junto com as fatias (scripts/gerar-assets-catalogo.mjs)");
  assert.equal(indice.grupos.reduce((s, g) => s + g.itens.length, 0), idx.total);
  assert.equal(indice.restritos.length, rIdx.receita.total + rIdx.controlados.total);
  // Sem texto de busca nem RMS (a lista recalcula / não usa): o arquivo só leva o que o cartão precisa.
  assert.ok(indice.grupos.every((g) => g.itens.every((i) => !("busca" in i) && !("categoria" in i))));
  assert.ok(indice.restritos.every((i) => !("busca" in i) && !("rms" in i)));
  const gerador = await readFile(new URL("../scripts/gerar-assets-catalogo.mjs", import.meta.url), "utf8");
  assert.match(gerador, /writeJson\("busca-index\.json"/);
});

test("estado da lista: nunca 'não encontramos' antes do catálogo chegar", async () => {
  const { estadoDaLista } = await indiceMod();
  // Carregando: sem resultados ainda, ou com busca (espera tudo para a contagem não pular).
  assert.equal(estadoDaLista({ completo: false, total: 0, procurando: false, buscando: true }), "carregando");
  assert.equal(estadoDaLista({ completo: false, total: 0, procurando: false }), "carregando");
  assert.equal(estadoDaLista({ completo: false, total: 2, procurando: false, buscando: true }), "carregando");
  // Sem busca, o que já chegou aparece aos poucos (caminho reserva, por fatias).
  assert.equal(estadoDaLista({ completo: false, total: 48, procurando: false }), "lista");
  // Catálogo completo.
  assert.equal(estadoDaLista({ completo: true, total: 2, procurando: false, buscando: true }), "lista");
  assert.equal(estadoDaLista({ completo: true, total: 0, procurando: true, buscando: true }), "procurando");
  assert.equal(estadoDaLista({ completo: true, total: 0, procurando: false, buscando: true }), "vazio");
});

test("índice inválido é recusado (a lista cai nas fatias)", async () => {
  const { indiceValido } = await indiceMod();
  assert.equal(indiceValido(null), false);
  assert.equal(indiceValido({ grupos: [] }), false);
  assert.equal(indiceValido({ grupos: [{ categoria: "Beleza", itens: [] }], restritos: [] }), true);
});

test("a lista mostra esqueleto e 'Buscando…' enquanto carrega, e o índice é pré-carregado", async () => {
  const lista = await readFile(new URL("../app/nacoes-unidas/produtos/CatalogoLista.tsx", import.meta.url), "utf8");
  assert.match(lista, /estadoDaLista\(/);
  assert.match(lista, /<EsqueletoGrade/);
  assert.match(lista, /carregarBuscaIndex\(\)/);
  const pagina = await readFile(new URL("../app/nacoes-unidas/produtos/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /preload\(URL_BUSCA_INDEX/);
  const css = await readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8");
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.pv-card--esqueleto/);
  const restrita = await readFile(new URL("../app/nacoes-unidas/produtos/ListaRestrita.tsx", import.meta.url), "utf8");
  assert.match(restrita, /!carregado \?/);
  const cabecalho = await readFile(new URL("../app/shop/ShopHeader.tsx", import.meta.url), "utf8");
  assert.match(cabecalho, /restritosCarregados && resultados\.length/);
});
