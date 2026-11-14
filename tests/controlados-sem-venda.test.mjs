import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lerTexto = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const lerJson = async (a) => JSON.parse(await lerTexto(a));

test("Sem venda no site: Portaria 344 (A1 a A3, B1, B2, C1 a C5) e antimicrobianos", async () => {
  const { ehPortaria344, carregarRestritos } = await import("../app/nacoes-unidas/produtos/receita.ts");
  for (const lista of ["A1", "A2", "A3", "B1", "B2", "C1", "C2", "C5", " c1 "]) assert.equal(ehPortaria344(true, lista), true, lista);
  for (const lista of ["A/B", "D1", "", undefined, null]) assert.equal(ehPortaria344(true, lista), false, String(lista));
  const { ehAntimicrobiano, classificarSemVenda } = await import("../app/nacoes-unidas/produtos/sem-venda.ts");
  for (const nome of ["Amoxicilina 500mg Cx 21 cápsulas Germed", "CEFTRIAXONA 1G IM PO INJ", "Azitromicina 500mg 3 comprimidos", "NITROFURANTOÍNA 100MG", "Fluconazol 150mg cx 2 cap"]) assert.equal(ehAntimicrobiano(nome), true, nome);
  // Uso tópico e outros remédios com receita ficam de fora.
  for (const nome of ["Mupirocina creme 15g", "Gentamicina colírio", "Losartana 50mg Cx 30 comprimidos", "Dipirona 1g"]) assert.equal(ehAntimicrobiano(nome), false, nome);
  assert.deepEqual(classificarSemVenda({ controlado: false, lista: undefined, nome: "Dipirona 1g", retencao: false }), { portaria344: false, antimicrobiano: false, semVenda: false });
  assert.deepEqual(classificarSemVenda({ controlado: false, lista: undefined, nome: "Ceftriaxona 1g", retencao: true }), { portaria344: false, antimicrobiano: true, semVenda: true });
  assert.deepEqual(classificarSemVenda({ controlado: false, lista: undefined, nome: "Ceftriaxona 1g", retencao: false }).semVenda, false, "sem receita retida não conta");
  assert.deepEqual(classificarSemVenda({ controlado: true, lista: "B1", nome: "Alprazolam", retencao: true }), { portaria344: true, antimicrobiano: false, semVenda: true });
  assert.equal(ehPortaria344(false, "C1"), false, "só vale dentro da lista de controlados");
  const { controlados } = carregarRestritos();
  const especiais = controlados.filter((i) => i.portaria344);
  assert.ok(especiais.length > 100, "a maior parte da lista de controlados é de controle especial");
  for (const i of especiais) assert.equal(i.preco, null, `${i.nome} não tem preço no site`);
  // Antimicrobianos (lista A/B do catálogo) também ficam sem preço, por cautela.
  const antimicrobianos = controlados.filter((i) => i.antimicrobiano);
  assert.ok(antimicrobianos.length > 50);
  for (const i of antimicrobianos) assert.equal(i.preco, null, `${i.nome} não tem preço no site`);
  assert.ok(controlados.every((i) => i.semVenda), "tudo que está na lista de controlados fica sem venda");
});

test("Portaria 344: os arquivos públicos (listas e busca do cabeçalho) não levam o preço desses itens", async () => {
  const idx = await lerJson("public/dados/nacoes/restritos-index.json");
  const paginas = idx.controlados.paginas;
  assert.ok(paginas > 0, "índice de controlados");
  for (let p = 1; p <= paginas; p += 1) {
    const dados = await lerJson(`public/dados/nacoes/restritos/controlados/p${p}.json`);
    const itens = Array.isArray(dados) ? dados : dados.itens;
    for (const i of itens) if (i.semVenda) assert.ok(!i.preco && !i.precoFmt, `${i.nome} (p${p})`);
  }
  const busca = await lerJson("public/dados/nacoes/restritos-busca.json");
  const especiais = busca.filter((i) => i.portaria344);
  assert.ok(especiais.length > 30, "a busca do cabeçalho ainda acha esses itens (só sem preço)");
  for (const i of especiais) assert.equal(i.precoCentavos, null, i.nome);
  const semVenda = busca.filter((i) => i.semVenda);
  assert.ok(semVenda.length > especiais.length, "antimicrobianos também saem sem preço");
  for (const i of semVenda) assert.equal(i.precoCentavos, null, i.nome);
});

test("Portaria 344: sem botão de cesta, sem pedido pelo WhatsApp e com aviso na lista, na busca e na página do produto", async () => {
  const [lista, busca, pagina, gerador, meta] = await Promise.all([
    lerTexto("app/nacoes-unidas/produtos/ListaRestrita.tsx"),
    lerTexto("app/shop/ShopHeader.tsx"),
    lerTexto("app/nacoes-unidas/produtos/[slug]/page.tsx"),
    lerTexto("scripts/gerar-assets-catalogo.mjs"),
    lerTexto("app/nacoes-unidas/produtos/restritos-meta.ts"),
  ]);
  assert.match(lista, /precoVazio=\{item\.semVenda \? "Consulte o farmacêutico" : undefined\}/);
  assert.match(busca, /item\.semVenda \? <small className="shop-sug-consulte">Consulte o farmacêutico<\/small>/);
  assert.match(pagina, /controlado = achado\.semVenda/);
  assert.match(pagina, /item\.esgotado \|\| controlado \? null : <ProdutoBarra/);
  assert.match(pagina, /não é vendido pelo site e não tem preço aqui/);
  // Sem "Vendido e entregue", sem entrega no bairro e sem pagamento na página de um controle especial.
  assert.match(pagina, /\{controlado \? null : <p className="pdp-vendido">/);
  assert.match(pagina, /\{controlado \? null : <ul className="pdp-receber"/);
  assert.match(gerador, /classificarSemVenda\(\{ controlado, lista: base\.lista, nome: base\.nome, retencao \}\)/);
  assert.match(meta, /não são vendidos pelo site e aparecem sem preço/);
});

test("Sem venda no site: a regra do gerador de arquivos é a mesma da cesta (listas de antimicrobianos e regra de Portaria 344 idênticas)", async () => {
  const { ANTIMICROB, TOPICO } = await import("../app/nacoes-unidas/produtos/sem-venda.ts");
  const gerador = await lerTexto("scripts/gerar-assets-catalogo.mjs");
  const pega = (nome) => new RegExp(`const ${nome} = /(.*)/;`).exec(gerador)?.[1];
  assert.equal(pega("ANTIMICROB"), ANTIMICROB.source.replaceAll("\\/", "/"));
  assert.equal(pega("TOPICO"), TOPICO.source.replaceAll("\\/", "/"));
  assert.match(gerador, /\^\(A\[1-3\]\|B\[12\]\|C\[1-5\]\)\$/);
});

test("Sem venda no site: a cesta guardada no navegador perde o controlado e o antimicrobiano que o cliente já tinha", async () => {
  const { lerEstado } = await import("../app/reserva/reserva-store.ts");
  const item = (id, nome, receita) => ({ id, unitId: "nacoes", nome, precoCentavos: 1000, qtd: 1, ...(receita ? { receita } : {}) });
  const estado = lerEstado(JSON.stringify({ modo: "retirar", itens: [item("a", "Creme dental Colgate"), item("b", "Alprazolam 0,5mg", "controlado"), item("c", "Amoxicilina 500mg Cx 21", "receita"), item("d", "Losartana 50mg", "receita")] }));
  assert.deepEqual(estado.itens.map((i) => i.id), ["a", "d"]);
});
