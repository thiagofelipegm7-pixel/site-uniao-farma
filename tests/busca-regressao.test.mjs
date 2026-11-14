import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { avaliarBusca, carregarContexto, NOTA } from "./helpers/busca-avaliar.mjs";

const casos = JSON.parse(readFileSync(new URL("./busca-casos.json", import.meta.url), "utf8"));
const ctx = carregarContexto();

test("regressão da busca: o arquivo de casos está bem formado e tem as buscas medidas", () => {
  assert.ok(casos.length >= 300, `${casos.length} casos`);
  const vistos = new Set();
  for (const c of casos) {
    assert.equal(typeof c.q, "string");
    assert.ok(c.st in NOTA, `${c.q}: estado ${c.st}`);
    assert.ok(Number.isInteger(c.n) && c.n >= 0);
    assert.ok(!vistos.has(c.q), `repetido: ${c.q}`);
    vistos.add(c.q);
  }
});

test("regressão da busca: nenhuma busca que já tinha resposta piora (jeitos de falar, correções, buscas parciais)", () => {
  const piorou = [];
  for (const c of casos) {
    // Com poucos produtos o resultado depende do estoque do dia (a loja tira e põe produto): só vigia o que tinha 3 ou mais.
    if (c.n < 3 && c.st !== "alternativa" && c.st !== "corrigida") continue;
    const r = avaliarBusca(c.q, ctx);
    if (NOTA[r.st] < NOTA[c.st]) piorou.push(`${c.q}: ${c.st} (${c.n}) -> ${r.st} (${r.n})`);
  }
  assert.deepEqual(piorou, [], `Buscas que pioraram. Rode "npm run busca:casos -- check" para ver; se foi por produto que saiu do catálogo, "npm run busca:casos -- refresh" só grava melhoras:\n${piorou.join("\n")}`);
});

test("regressão da busca: buscas-chave seguem resolvendo", () => {
  for (const [q, esperado] of [["fralda adulto", "alternativa"], ["tinta de cabelo", "alternativa"], ["fraldinha", "corrigida"], ["dor de cabeça", "sintoma-lista"], ["fralda", "ok"]]) {
    const r = avaliarBusca(q, ctx);
    assert.ok(NOTA[r.st] >= NOTA[esperado], `${q}: ${r.st}, esperado pelo menos ${esperado}`);
  }
});

test("regressão da busca: o painel copia o comando para pôr as buscas reais no teste e o script existe", () => {
  const painel = readFileSync(new URL("../app/components/BuscasSemResultado.tsx", import.meta.url), "utf8");
  assert.match(painel, /npm run busca:casos -- add/);
  const pacote = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pacote.scripts["busca:casos"], /scripts\/busca-casos\.mjs/);
});
