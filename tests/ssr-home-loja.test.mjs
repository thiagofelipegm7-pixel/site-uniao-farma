import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { VITRINES_HOME, vitrineHome } from "../app/shop/home-vitrines.ts";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("S-24: a lista de vitrines da home é única, em ordem e sem id repetido", () => {
  assert.equal(VITRINES_HOME.length, 8);
  assert.deepEqual(VITRINES_HOME.map((v) => v.posicao), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(new Set(VITRINES_HOME.map((v) => v.id)).size, VITRINES_HOME.length);
  assert.equal(vitrineHome("vitrine-higiene").grupo, "cuidado-diario");
  assert.throws(() => vitrineHome("nao-existe"));
});

test("S-24: a página da home escolhe os produtos no servidor e a HomePage os entrega a cada componente", async () => {
  const [pagina, home, servidor] = await Promise.all([ler("app/page.tsx"), ler("app/HomePage.tsx"), ler("app/shop/destaques-servidor.ts")]);
  assert.match(pagina, /export default async function Page/);
  assert.match(pagina, /await dadosDaHome\(\)/);
  assert.match(pagina, /<HomePage dados=\{dados\} \/>/);
  for (const trecho of ["inicial={dados.banners}", "inicial={dados.chips}", "inicial={dados.ofertas}", "inicial={dados.vitrines?.[v.id]}"]) assert.ok(home.includes(trecho), trecho);
  for (const id of VITRINES_HOME.map((v) => v.id)) assert.ok(home.includes(`vitrine("${id}")`), id);
  // Falha em uma parte não derruba a página: cada parte cai para o comportamento antigo (buscar no navegador).
  assert.match(servidor, /\.catch\(\(\) => undefined\)/);
});

test("S-24/S-25: cada componente aceita `inicial`, não busca no navegador quando ele existe e a vitrine vazia some", async () => {
  for (const arquivo of ["app/shop/DestaquesSemana.tsx", "app/shop/OfertasSemana.tsx", "app/shop/MaisPedidosChips.tsx", "app/shop/PainelBanners.tsx"]) {
    const f = await ler(arquivo);
    assert.match(f, /inicial/, arquivo);
    assert.match(f, /inicial !== undefined/, arquivo);
  }
  const vitrine = await ler("app/shop/DestaquesSemana.tsx");
  assert.match(vitrine, /useState\(inicial === undefined\)/);
});

test("S-24: a loja põe uma primeira página de produtos no HTML, no lugar do esqueleto", async () => {
  const [pagina, lista, servidor] = await Promise.all([ler("app/nacoes-unidas/produtos/page.tsx"), ler("app/nacoes-unidas/produtos/CatalogoLista.tsx"), ler("app/shop/destaques-servidor.ts")]);
  assert.match(pagina, /amostraDaLoja\(\)/);
  assert.match(pagina, /semente=\{semente\}/);
  assert.match(lista, /semente\?: ItemBusca\[\]/);
  assert.match(lista, /semente\.map\(/);
  assert.match(servidor, /export async function amostraDaLoja\(n = 24\)/); // 24 = POR_PAGINA da lista (mesma altura, sem pulo)
});

test("as rotas /api usam a mesma escolha do servidor (uma regra só)", async () => {
  for (const [arquivo, funcao] of [["app/api/destaques/route.ts", "selecionarDestaques"], ["app/api/ofertas-vitrine/route.ts", "ofertasDaHome"], ["app/api/banners-publico/route.ts", "bannersPublicos"]]) {
    assert.match(await ler(arquivo), new RegExp(funcao), arquivo);
  }
});

test("S-25: banner no HTML só se a arte for arquivo leve; arte embutida nunca vai no HTML e o painel reserva o espaço", async () => {
  const [servidor, home, painel] = await Promise.all([ler("app/shop/destaques-servidor.ts"), ler("app/HomePage.tsx"), ler("app/shop/PainelBanners.tsx")]);
  assert.match(servidor, /export function bannersLeves/);
  assert.match(servidor, /startsWith\("data:"\)/); // se ainda houver data URL, volta ao comportamento de buscar no navegador
  assert.match(home, /inicial=\{dados\.banners\}/);
  assert.match(painel, /useState\(inicial === undefined && !fonte\)/); // sem `inicial`, reserva o espaço por padrão (sem "pulo")
  assert.match(painel, /getItem\("uf_banners"\) !== "0"/);
  assert.match(painel, /preload\("\/api\/banners-publico", \{ as: "fetch"/); // sem `inicial`, a lista começa a baixar já no HTML (LCP)
});

test("catálogo e base das vitrines são montados uma vez por processo (cada página remontava ≈2.400 itens várias vezes)", async () => {
  const [catalogo, servidor] = await Promise.all([ler("app/nacoes-unidas/produtos/catalogo.ts"), ler("app/shop/destaques-servidor.ts")]);
  assert.match(catalogo, /catalogoCompletoPronto/);
  assert.match(catalogo, /catalogoNacoesPronto/);
  assert.match(servidor, /baseMemo/);
  assert.match(servidor, /function baseDoCatalogo/);
});
