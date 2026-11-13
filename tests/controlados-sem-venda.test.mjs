import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lerTexto = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const lerJson = async (a) => JSON.parse(await lerTexto(a));

test("Portaria 344: só as listas A1 a A3, B1, B2 e C1 a C5 perdem o preço (antimicrobiano segue como estava)", async () => {
  const { ehPortaria344, carregarRestritos } = await import("../app/nacoes-unidas/produtos/receita.ts");
  for (const lista of ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C5", " c1 "]) assert.equal(ehPortaria344(true, lista), true, lista);
  for (const lista of ["A/B", "D1", "", undefined, null]) assert.equal(ehPortaria344(true, lista), false, String(lista));
  assert.equal(ehPortaria344(false, "C1"), false, "só vale dentro da lista de controlados");
  const { controlados } = carregarRestritos();
  const especiais = controlados.filter((i) => i.portaria344);
  assert.ok(especiais.length > 100, "a maior parte da lista de controlados é de controle especial");
  for (const i of especiais) assert.equal(i.preco, null, `${i.nome} não tem preço no site`);
  assert.ok(controlados.some((i) => !i.portaria344 && i.preco !== null), "antimicrobianos continuam com preço");
});

test("Portaria 344: os arquivos públicos (listas e busca do cabeçalho) não levam o preço desses itens", async () => {
  const idx = await lerJson("public/dados/nacoes/restritos-index.json");
  const paginas = idx.controlados.paginas;
  assert.ok(paginas > 0, "índice de controlados");
  for (let p = 1; p <= paginas; p += 1) {
    const dados = await lerJson(`public/dados/nacoes/restritos/controlados/p${p}.json`);
    const itens = Array.isArray(dados) ? dados : dados.itens;
    for (const i of itens) if (i.portaria344) assert.ok(!i.preco && !i.precoFmt, `${i.nome} (p${p})`);
  }
  const busca = await lerJson("public/dados/nacoes/restritos-busca.json");
  const especiais = busca.filter((i) => i.portaria344);
  assert.ok(especiais.length > 30, "a busca do cabeçalho ainda acha esses itens (só sem preço)");
  for (const i of especiais) assert.equal(i.precoCentavos, null, i.nome);
});

test("Portaria 344: sem botão de cesta, sem pedido pelo WhatsApp e com aviso na lista, na busca e na página do produto", async () => {
  const [lista, busca, pagina, gerador, meta] = await Promise.all([
    lerTexto("app/nacoes-unidas/produtos/ListaRestrita.tsx"),
    lerTexto("app/shop/ShopHeader.tsx"),
    lerTexto("app/nacoes-unidas/produtos/[slug]/page.tsx"),
    lerTexto("scripts/gerar-assets-catalogo.mjs"),
    lerTexto("app/nacoes-unidas/produtos/restritos-meta.ts"),
  ]);
  assert.match(lista, /precoVazio=\{item\.portaria344 \? "Consulte o farmacêutico" : undefined\}/);
  assert.match(busca, /item\.portaria344 \? <small className="shop-sug-consulte">Consulte o farmacêutico<\/small>/);
  assert.match(pagina, /controlado = achado\.portaria344/);
  assert.match(pagina, /item\.esgotado \|\| controlado \? null : <ProdutoBarra/);
  assert.match(pagina, /não é vendido pelo site e não tem preço aqui/);
  // Sem "Vendido e entregue", sem entrega no bairro e sem pagamento na página de um controle especial.
  assert.match(pagina, /\{controlado \? null : <p className="pdp-vendido">/);
  assert.match(pagina, /\{controlado \? null : <ul className="pdp-receber"/);
  assert.match(gerador, /portaria344 = controlado && \/\^\(A\[1-3\]\|B\[12\]\|C\[1-5\]\)\$\/i/);
  assert.match(meta, /não são vendidos pelo site e aparecem sem preço/);
});
