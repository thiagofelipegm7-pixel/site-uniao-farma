import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

/** Produtos reais do catálogo com código de barras (é por ele que a lista reconhece o grupo). */
async function produtosDeTeste(qtd) {
  const { carregarCatalogoCompleto, slugify } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const { codigoDoItem } = await import("../app/variacoes-resolver.ts");
  const itens = carregarCatalogoCompleto().itens.filter((i) => i.categoria !== "Medicamentos" && i.esgotado !== true && i.preco > 5);
  const escolhidos = [];
  for (const i of itens) {
    const ean = codigoDoItem(i);
    if (ean && !escolhidos.some((e) => e.ean === ean)) escolhidos.push({ ean, nome: i.nome, slug: slugify(i.nome) });
    if (escolhidos.length === qtd) break;
  }
  assert.equal(escolhidos.length, qtd, "catálogo tem produtos com código para o teste");
  return escolhidos;
}

const itemDaLista = (p, extra = {}) => ({ nome: p.nome, lab: "Lab", precoFmt: "R$ 50,00", preco: 50, isMIP: false, foto: `/fotos/${p.ean}.webp`, slug: p.slug, restam: 3, ...extra });
const ficha = (p, rotulo, centavos, esgotado = false) => ({ ean: p.ean, rotulo, nome: p.nome, slug: p.slug, precoCentavos: centavos, esgotado });

test("listas: tamanhos do mesmo grupo viram um cartão só, na posição do primeiro, com título e preço a partir de", async () => {
  const { agruparNasListas } = await import("../app/nacoes-unidas/produtos/variacoes-agrupar.ts");
  const [a, b, c, x, y] = await produtosDeTeste(5);
  const grupo = { grupo: "g1", eixo: "Tamanho", nome: "Fralda de teste", fichas: [ficha(a, "P", 8990), ficha(b, "M", 7990), ficha(c, "G", 9990)] };
  const lista = [itemDaLista(a), itemDaLista(x), itemDaLista(b), itemDaLista(y), itemDaLista(c)];

  const sem = agruparNasListas(lista, undefined);
  assert.equal(sem.length, 5, "sem grupos a lista não muda");
  assert.equal(agruparNasListas(lista, []).length, 5);

  const out = agruparNasListas(lista, [grupo]);
  assert.equal(out.length, 3, "três tamanhos viram um cartão; os outros dois produtos ficam");
  assert.deepEqual(out.map((i) => i.nome), ["Fralda de teste", x.nome, y.nome], "o cartão fica onde estava o primeiro tamanho");
  const cartao = out[0];
  assert.equal(cartao.variacoes.eixo, "Tamanho");
  assert.deepEqual(cartao.variacoes.fichas.map((f) => f.rotulo), ["P", "M", "G"]);
  assert.equal(cartao.slug, a.slug, "o cartão leva ao primeiro tamanho com estoque que está na lista");
  assert.equal(cartao.variacoes.atual, a.ean);
  assert.match(cartao.precoFmt, /79,90/, "preço do cartão é o menor entre as opções");
  assert.equal(cartao.aPartirDe, true);
  assert.equal(cartao.esgotado, false);
  assert.equal(cartao.restam, undefined, "a trava de unidades vale por produto, não pelo cartão");
  assert.equal(cartao.foto, `/fotos/${a.ean}.webp`);
});

test("listas: opção esgotada não vira o produto do cartão nem o preço; todas esgotadas = cartão esgotado", async () => {
  const { agruparNasListas } = await import("../app/nacoes-unidas/produtos/variacoes-agrupar.ts");
  const [a, b, c] = await produtosDeTeste(3);
  // O primeiro a aparecer está esgotado; o cartão escolhe o primeiro com estoque que também está na lista.
  const grupo = { grupo: "g", eixo: "Cor", nome: null, fichas: [ficha(a, "Azul", 3000, true), ficha(b, "Rosa", 4500), ficha(c, "Verde", 4000)] };
  const lista = [itemDaLista(a, { esgotado: true }), itemDaLista(b), itemDaLista(c)];
  const [cartao] = agruparNasListas(lista, [grupo]);
  assert.equal(cartao.slug, b.slug);
  assert.equal(cartao.nome, b.nome, "sem título do grupo, vale o nome do produto do cartão");
  assert.match(cartao.precoFmt, /40,00/, "o menor preço entre as opções COM estoque (o esgotado de R$ 30 não conta)");
  assert.equal(cartao.esgotado, false);

  const todas = { grupo: "t", eixo: "Tamanho", nome: "Todas", fichas: [ficha(a, "P", 3000, true), ficha(b, "M", 3500, true)] };
  const [fim] = agruparNasListas([itemDaLista(a, { esgotado: true }), itemDaLista(b, { esgotado: true })], [todas]);
  assert.equal(fim.esgotado, true);
  assert.equal(fim.aPartirDe, true);
  assert.match(fim.precoFmt, /30,00/, "tudo esgotado: mostra o menor preço de qualquer opção");
});

test("listas: filtro ou busca que deixa só um tamanho ainda mostra o cartão com todas as opções; dois grupos viram dois cartões", async () => {
  const { agruparNasListas } = await import("../app/nacoes-unidas/produtos/variacoes-agrupar.ts");
  const [a, b, c, d, e] = await produtosDeTeste(5);
  const g1 = { grupo: "g1", eixo: "Tamanho", nome: "Grupo 1", fichas: [ficha(a, "P", 5000), ficha(b, "M", 5000), ficha(c, "G", 5000)] };
  const g2 = { grupo: "g2", eixo: "Cor", nome: "Grupo 2", fichas: [ficha(d, "Azul", 2000), ficha(e, "Rosa", 2000)] };
  // Só o M do grupo 1 chegou na lista (os outros foram filtrados): o cartão aparece com as 3 opções.
  const so = agruparNasListas([itemDaLista(b)], [g1]);
  assert.equal(so.length, 1);
  assert.equal(so[0].variacoes.fichas.length, 3);
  assert.equal(so[0].slug, b.slug);
  assert.equal(so[0].aPartirDe, false, "preços iguais: sem 'a partir de'");
  // Dois grupos entrelaçados.
  const dois = agruparNasListas([itemDaLista(a), itemDaLista(d), itemDaLista(b), itemDaLista(e), itemDaLista(c)], [g1, g2]);
  assert.deepEqual(dois.map((i) => i.nome), ["Grupo 1", "Grupo 2"]);
  // Produto sem código de barras reconhecido nunca é agrupado.
  const solto = { ...itemDaLista(a), nome: "PRODUTO SEM CODIGO QUALQUER 123" };
  assert.equal(agruparNasListas([solto], [g1]).length, 1);
  assert.equal(agruparNasListas([solto], [g1])[0].variacoes, undefined);
});

test("listas no site: lista busca os grupos, junta antes de contar e paginar, e o cartão único não tem cesta nem link dentro de link", async () => {
  const [lista, cartao, chips, css, rota, tipos] = await Promise.all([
    ler("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    ler("app/nacoes-unidas/produtos/CartaoPanvel.tsx"),
    ler("app/nacoes-unidas/produtos/ChipsVariacoesCartao.tsx"),
    ler("app/variacoes.css"),
    ler("app/api/variacoes-produto/route.ts"),
    ler("app/nacoes-unidas/produtos/busca.ts"),
  ]);
  assert.match(lista, /fetch\("\/api\/variacoes-produto", \{ cache: "no-store" \}\)/);
  assert.match(lista, /const itensVisiveis = agruparNasListas\(visiveis\.flatMap\(\(g\) => g\.itens\), gruposVariacoes\);/);
  assert.match(lista, /const total = gruposVariacoes\.length > 0 \? itensVisiveis\.length : contarItens\(visiveis\);/);
  assert.match(lista, /const itensDaPagina = itensVisiveis\.slice\(/);
  assert.match(lista, /agruparNasListas\(semente, gruposVariacoes\)/); // o HTML de amostra também vem agrupado
  assert.match(lista, /cesta=\{centavos && !item\.esgotado && !item\.variacoes \?/); // com tamanhos, a cesta fica na página do produto
  assert.match(lista, /extra=\{item\.variacoes \? <ChipsVariacoesCartao variacoes=\{item\.variacoes\} nome=\{nome\} \/> : undefined\}/);
  assert.match(lista, /classe=\{item\.variacoes \? "pv-card--variacoes" : undefined\}/); // o cartão cresce com as fichas
  assert.match(css, /\.pv-card\.pv-card--variacoes \{\s*aspect-ratio: auto !important;\s*height: auto !important;/); // o cartão normal tem proporção fixa e esconde o excesso
  assert.match(cartao, /\{aPartirDe \? \(\s*<span className="pv-preco-opcoes"><small>A partir de<\/small>/);
  // As fichas vão no slot "extra", fora do <a class="pv-corpo">: sem link dentro de link.
  assert.match(cartao, /<\/a>[\s\S]*?\{extra\}/);
  assert.match(chips, /<nav className="pv-variacoes" aria-label=/); // A-12
  assert.match(chips, /aria-label=\{`\$\{eixo\} \$\{f\.rotulo\}, \$\{reais\(f\.precoCentavos\)\}\$\{f\.esgotado \? ", esgotado" : ""\}`\}/); // A-14
  assert.match(css, /\.pv-variacoes-ficha\.is-esgotado \{\s*text-decoration: line-through !important;/); // A-04: esgotado não é só cor
  assert.match(css, /\.pv-variacoes-ficha\.pv-variacoes-ficha \{[\s\S]*?min-height: 3rem !important;/); // A-10
  assert.match(rota, /resolverGrupo/);
  assert.match(rota, /catch \{\s*return Response\.json\(\{ grupos: \[\] \}/); // falha do banco = lista normal
  assert.match(tipos, /variacoes\?: \{ eixo: string;/);
});
