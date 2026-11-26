import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (a) => readFileSync(new URL(`../${a}`, import.meta.url), "utf8");

test("pedir de novo: o cartão fica fora da grade do cabeçalho, com texto que encolhe e botão que não encolhe", () => {
  const header = ler("app/shop/ShopHeader.tsx");
  const blocos = ler("app/shop/HomeBlocos.tsx");
  const card = ler("app/shop/PedirDeNovo.tsx");
  const css = ler("app/shop/shop.css");

  // O cartão não pode ser filho do <header>: no Firefox a grade do celular
  // (coluna do menu com 2,75 rem) espremia o texto e jogava o botão para fora.
  assert.match(header, /<\/header>\s*<PedirDeNovo \/>/);
  assert.match(header, /import PedirDeNovo from "\.\/PedirDeNovo"/);
  assert.doesNotMatch(blocos, /PedirDeNovo/);
  assert.match(card, /className="pedir-de-novo"/);
  assert.match(card, /className="pedir-de-novo-texto"/);
  assert.match(card, /className="pedir-de-novo-botao"/);

  assert.match(css, /\.pedir-de-novo \{[^}]*display:\s*flex/s);
  assert.match(css, /\.pedir-de-novo-texto \{[^}]*min-width:\s*0/s);
  assert.match(css, /\.pedir-de-novo-botao \{[^}]*flex:\s*0 0 auto/s);
  assert.match(css, /\.pedir-de-novo-botao \{[^}]*white-space:\s*nowrap/s);
});
