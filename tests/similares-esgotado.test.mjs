import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const S = await import("../app/nacoes-unidas/produtos/similares.ts");
const ler = (a) => readFileSync(new URL(`../${a}`, import.meta.url), "utf8");

const item = (nome, lab, preco, extra = {}) => ({ nome, lab, isMIP: false, precoFmt: `R$ ${preco.toFixed(2).replace(".", ",")}`, preco, foto: "/produtos/1.webp", tipo: "Sabonetes", ...extra });
const grupos = (itens, categoria = "Cuidado Diário") => [{ categoria, id: "x", itens }];

test("parecidos: só quando tudo o que a busca achou está esgotado e não é remédio", () => {
  assert.equal(S.precisaSimilares([]), false);
  assert.equal(S.precisaSimilares([item("Sabonete Protex", "COLGATE", 4, { esgotado: true })]), true);
  assert.equal(S.precisaSimilares([item("Sabonete Protex", "COLGATE", 4, { esgotado: true }), item("Sabonete Dove", "UNILEVER", 4)]), false, "se achou algo em estoque, não precisa");
  assert.equal(S.precisaSimilares([item("Dipirona 500mg", "EMS", 8, { esgotado: true, isMIP: true })]), false, "remédio nunca");
  assert.equal(S.precisaSimilares([item("Remédio", "X", 8, { esgotado: true, restrito: { tipo: "receita" } })]), false);
});

test("parecidos: mesmo tipo e marca primeiro, nunca remédio, sem foto, esgotado nem o que a busca já mostrou", () => {
  const esgotados = [item("Sabonete Protex Nutri Protect 85g", "COLGATE", 4.5, { esgotado: true })];
  const base = grupos([
    ...esgotados,
    item("Sabonete Protex Fresh 85g", "COLGATE", 4.2),
    item("Sabonete Dove Original 90g", "UNILEVER", 5.5),
    item("Sabonete Lux Botanicals 85g", "UNILEVER", 3.9),
    item("Shampoo Seda 325ml", "UNILEVER", 14, { tipo: "Shampoos" }),
    item("Sabonete Sem Foto 80g", "X", 4, { foto: null }),
    item("Sabonete Esgotado Antigo 80g", "X", 4, { esgotado: true }),
    item("Sabonete Medicinal Remédio 80g", "X", 4, { isMIP: true }),
  ]);
  const r = S.similaresEmEstoque(base, esgotados, 8).map((i) => i.nome);
  assert.equal(r[0], "Sabonete Protex Fresh 85g", "mesma marca e mesmo tipo vem primeiro");
  assert.ok(r.includes("Sabonete Dove Original 90g") && r.includes("Sabonete Lux Botanicals 85g"));
  for (const fora of ["Shampoo Seda 325ml", "Sabonete Sem Foto 80g", "Sabonete Esgotado Antigo 80g", "Sabonete Medicinal Remédio 80g", "Sabonete Protex Nutri Protect 85g"]) assert.ok(!r.includes(fora), fora);
  assert.equal(S.similaresEmEstoque(base, esgotados, 1).length, 1, "respeita o limite");
  // grupo de medicamentos nunca fornece parecidos
  assert.deepEqual(S.similaresEmEstoque(grupos([item("Sabonete Antisséptico 80g", "X", 4)], "Medicamentos"), esgotados), []);
  // referência que é remédio: nada
  assert.deepEqual(S.similaresEmEstoque(base, [item("Dipirona", "EMS", 8, { esgotado: true, isMIP: true })]), []);
});

test("lista: bloco de parecidos usa as regras e oferece perguntar quando chega, sem alterar a lista principal", () => {
  const l = ler("app/nacoes-unidas/produtos/CatalogoLista.tsx");
  assert.match(l, /precisaSimilares\(achadosPorTexto\) \? similaresEmEstoque\(base, achadosPorTexto, 8\) : \[\]/);
  assert.match(l, /Parecidos em estoque/);
  assert.match(l, /Pergunte quando chega/);
  assert.match(l, /\{itensDaPagina\.map\(renderCartao\)\}/);
  assert.match(l, /aparece esgotado no site\. Quando chega de novo\?/);
});
