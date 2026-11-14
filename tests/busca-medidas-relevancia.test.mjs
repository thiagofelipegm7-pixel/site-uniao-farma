import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const B = await import("../app/nacoes-unidas/produtos/busca.ts");
const R = await import("../app/nacoes-unidas/produtos/relevancia.ts");
const lerTexto = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("medidas: número e unidade juntos, apelidos de unidade e decimal com vírgula viram uma forma só", () => {
  const casos = [
    ["Shampoo 400 ml", "shampoo 400ml"], ["Shampoo 400ML", "shampoo 400ml"], ["fralda 8 unidades", "fralda 8un"], ["Fralda 7UND", "fralda 7un"],
    ["pacote 10 Unid", "pacote 10un"], ["álcool 1 litro", "alcool 1l"], ["Álcool 1LITRO", "alcool 1l"], ["suco 1,5 L", "suco 1.5l".replace(".", " ")],
    ["Dipirona 500 mg", "dipirona 500mg"], ["Creme 90 g", "creme 90g"], ["protetor FPS 50", "protetor fps 50"], ["Neodia 1.5mg", "neodia 1 5mg"], ["c/ 8 un", "c 8un"],
  ];
  for (const [entrada, esperado] of casos) assert.equal(B.textoDeBusca(entrada), esperado, entrada);
  // O que o cliente digita acha o nome do sistema, de qualquer jeito de escrever.
  const acha = (nome, q) => B.termosDaConsulta(q).every((t) => B.casaTermo(B.textoDeBusca(nome), t));
  assert.ok(acha("Shampoo Dove 400ML", "shampoo 400 ml"));
  assert.ok(acha("Shampoo Dove 400 ml", "shampoo 400ml"));
  assert.ok(acha("Fralda Bigfral G 8UND", "fralda 8 unidades"));
  assert.ok(acha("Fralda Bigfral G 8UND", "fralda c/8"));
  assert.ok(acha("Álcool Etilico 1LITRO", "alcool 1 litro"));
  assert.ok(acha("Suco 1,5 L", "suco 1,5 litros"));
  assert.ok(acha("Fralda Salute Senior Premium tamanho G 8UN", "fralda tamanho g"));
});

test("medidas: sigla de tamanho só casa palavra inteira e número só casa inteiro", () => {
  assert.equal(B.casaTermo("fralda babysec mega g 32un", "g"), true);
  assert.equal(B.casaTermo("fralda babysec xg 56un", "g"), false, "xg não é g");
  assert.equal(B.casaTermo("fralda tam g", "g"), true);
  assert.equal(B.casaTermo("shampoo agua", "g"), false, "g no meio de palavra não vale");
  assert.equal(B.casaTermo("fralda 8un", "8"), true);
  assert.equal(B.casaTermo("fralda 18un", "8"), false);
  assert.equal(B.casaTermo("fralda 80un", "8"), false);
  assert.equal(B.casaTermo("neodia 1 5mg", "1"), true);
  assert.equal(B.casaTermo("fraldas", "fralda"), true, "palavra comprida casa em qualquer ponto");
});

test("medidas: o gerador dos arquivos de busca tem a mesma função (mesma saída)", async () => {
  const gerador = await lerTexto("scripts/gerar-assets-catalogo.mjs");
  const ini = gerador.indexOf("const UNIDADE = ");
  const fim = gerador.indexOf("function slugify");
  assert.ok(ini > 0 && fim > ini);
  const replica = new Function(`${gerador.slice(ini, fim)}; return textoDeBusca;`)();
  for (const t of ["Shampoo Dove 400 ML", "Álcool 1,5 litros", "Fralda 8 Unidades c/ 2", "Neodia 1.5mg Cx 1 comprimidos", "Absorvente C/8 UN Suave", "PROTETOR FPS 50 120 g", "Creme Nívea 2L", "  Proteção   SOLAR "]) {
    assert.equal(replica(t), B.textoDeBusca(t), t);
  }
});

const item = (nome, lab = "", extra = {}) => ({ nome, lab, isMIP: false, precoFmt: "R$ 10,00", foto: "/produtos/1.webp", ...extra });
const nomes = (grupos) => grupos.flatMap((g) => g.itens.map((i) => i.nome));

test("relevância: palavra no começo do nome, marca igual, frase junta e palavra inteira vêm antes; esgotado vai para o fim", () => {
  const grupos = [
    { categoria: "Beleza", id: "b", itens: [item("Fita Fralda Cremer Azul", "CREMER"), item("Sabonete Dove Original", "UNILEVER"), item("Kit Presente com Fralda", "X", { foto: null })] },
    { categoria: "Infantil", id: "i", itens: [item("Fralda Pampers Esgotada G", "PAMPERS", { esgotado: true }), item("Fralda Babysec Mega G 32UND", "BABYSEC"), item("Fraldinha de Boca", "BEBE")] },
  ];
  const ordem = nomes(R.ordenarPorRelevancia(grupos, ["fralda"]));
  assert.equal(ordem[0], "Fralda Babysec Mega G 32UND");
  assert.equal(ordem[ordem.length - 1], "Fralda Pampers Esgotada G", "esgotado por último");
  assert.ok(ordem.indexOf("Fita Fralda Cremer Azul") > ordem.indexOf("Fralda Babysec Mega G 32UND"), "'Fita Fralda' depois de 'Fralda …'");
  // marca igual ao termo
  const marcas = [{ categoria: "X", id: "x", itens: [item("Creme Hidratante Corporal", "NIVEA", { foto: null }), item("Sabonete Dove Original", "DOVE"), item("Hidratante com Dove Soft", "OUTRA")] }];
  assert.equal(nomes(R.ordenarPorRelevancia(marcas, ["dove"]))[0], "Sabonete Dove Original");
  // frase inteira junta
  const frase = [{ categoria: "X", id: "x", itens: [item("Creme para Dentes e Gengivas", "A"), item("Creme Dental Colgate", "COLGATE")] }];
  assert.equal(nomes(R.ordenarPorRelevancia(frase, ["creme", "dental"]))[0], "Creme Dental Colgate");
  // sem termo ou sem item
  assert.deepEqual(R.ordenarPorRelevancia(grupos, []).length, 2);
  assert.deepEqual(R.ordenarPorRelevancia([], ["x"]), []);
  // empate mantém a ordem do catálogo
  const empate = [{ categoria: "X", id: "x", itens: [item("Sabonete A", "L"), item("Sabonete B", "L"), item("Sabonete C", "L")] }];
  assert.deepEqual(nomes(R.ordenarPorRelevancia(empate, ["sabonete"])), ["Sabonete A", "Sabonete B", "Sabonete C"]);
});

test("relevância: a lista só reordena em 'Recomendados' com busca; preço e outras ordens ficam como o cliente escolheu", async () => {
  const lista = await lerTexto("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(lista, /ordem === "recomendados" && termosRelevancia\.length > 0 \? ordenarPorRelevancia\(visiveisBase, termosRelevancia\) : visiveisBase/);
  assert.match(lista, /textoDeBusca\(`\$\{item\.nome\}/);
});
