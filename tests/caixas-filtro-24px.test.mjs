import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (a) => readFileSync(new URL(`../${a}`, import.meta.url), "utf8");

test("caixas de seleção dos filtros: todas com 24 px, na camada design, cobrindo os três estilos que existiam", () => {
  const css = ler("app/destaque-cesta.css");
  const bloco = css.slice(css.indexOf('html body .catalogo-filtro-opcao input[type="checkbox"]'));
  for (const seletor of ['.catalogo-filtro-opcao input[type="checkbox"]', '.fc .fc-opcao input[type="checkbox"]', '.pv-filtros input[type="checkbox"]']) {
    assert.ok(bloco.includes(`html body ${seletor}`), seletor);
  }
  assert.match(bloco, /width: 24px !important;\s*height: 24px !important;/);
  assert.match(bloco, /background-size: 16px !important/, "o certo desenhado acompanha o tamanho");
  assert.ok(css.lastIndexOf("@layer design", css.indexOf("width: 24px !important")) > css.lastIndexOf("}\n\n/*", css.indexOf("width: 24px !important")) - 1);
  // Os três estilos antigos continuam definidos (a regra nova só os supera): o teste avisa se alguém trocar o tamanho no lugar errado.
  assert.match(ler("app/nacoes-unidas/produtos/produtos.css"), /\.catalogo-filtro-opcao input \{[^}]*width: 22px;/);
});
