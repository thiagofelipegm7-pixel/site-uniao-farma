import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TEMA_ATIVO_ATE, temaAtual } from "../app/tema-sazonal.ts";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("tema Black Friday permanece ligado enquanto a campanha não tiver data de fim", () => {
  assert.equal(TEMA_ATIVO_ATE, null);
  assert.equal(temaAtual(Date.parse("2026-11-27T12:00:00-03:00")), "black-friday");
  assert.equal(temaAtual(Date.parse("2026-11-28T12:00:00-03:00")), "black-friday");
});

test("tema só troca cores com html[data-tema] e a faixa fica escondida fora do tema", async () => {
  const [css, layout, faixa] = await Promise.all([ler("app/tema-black-friday.css"), ler("app/layout.tsx"), ler("app/FaixaBlackFriday.tsx")]);
  assert.match(css, /@layer base-direcao/);
  assert.match(css, /html body \.faixa-black-friday \{\s*display: none !important;/);
  assert.doesNotMatch(css, /#ffe600|#b71c1c/i); // sem o amarelo e o vermelho recusados
  assert.match(layout, /data-tema=\{temaAtual\(\) \?\? undefined\}/);
  assert.match(faixa, /<aside[^>]*aria-label=/); // dentro de landmark (A-12)
  assert.match(faixa, /Ver as ofertas</); // CTA diz o que a pessoa recebe (C-10)
  assert.match(faixa, /Ofertas por tempo limitado/);
  assert.doesNotMatch(faixa, /27\/11|só nesta sexta/);
});
