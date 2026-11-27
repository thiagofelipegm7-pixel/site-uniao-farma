import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { TEMA_ATIVO_ATE, temaAtual } from "../app/tema-sazonal.ts";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("tema Black Friday desliga sozinho no fim da validade (faixa nunca anuncia oferta vencida)", () => {
  const fim = Date.parse(TEMA_ATIVO_ATE);
  assert.equal(temaAtual(fim - 1), "black-friday");
  assert.equal(temaAtual(fim), null);
  assert.equal(temaAtual(fim + 86_400_000), null);
});

test("tema só troca cores com html[data-tema] e a faixa fica escondida fora do tema", async () => {
  const [css, layout, faixa] = await Promise.all([ler("app/tema-black-friday.css"), ler("app/layout.tsx"), ler("app/FaixaBlackFriday.tsx")]);
  assert.match(css, /@layer base-direcao/);
  assert.match(css, /html body \.faixa-black-friday \{\s*display: none !important;/);
  assert.doesNotMatch(css, /#ffe600|#b71c1c/i); // sem o amarelo e o vermelho recusados
  assert.match(layout, /data-tema=\{temaAtual\(\) \?\? undefined\}/);
  assert.match(faixa, /<aside[^>]*aria-label=/); // dentro de landmark (A-12)
  assert.match(faixa, /Ver as ofertas de hoje/); // CTA diz o que a pessoa recebe (C-10)
});
