import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");

test("seletor de bairro usa só os bairros confirmados em deliveryAreas", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  const { listarBairros, lojaDoBairro, mensagemEntrega } = await import("../app/entrega-bairro.ts");
  const lista = listarBairros(UNITS);
  const confirmados = UNITS.flatMap((u) => u.deliveryAreas).sort((a, b) => a.localeCompare(b, "pt-BR"));
  assert.deepEqual(lista.map((b) => b.bairro), confirmados);
  for (const { bairro, unitId } of lista) assert.equal(lojaDoBairro(UNITS, bairro)?.id, unitId);
  assert.equal(lojaDoBairro(UNITS, "Bairro Inventado"), null);
  const nacoes = UNITS.find((u) => u.id === "nacoes");
  assert.equal(mensagemEntrega(nacoes, "Nações Unidas"), `Oi, União Farma ${nacoes.shortName}! Moro no bairro Nações Unidas e quero fazer um pedido para entrega.`);
});

test("página de entrega tem o seletor acessível, sem rede e com clique rastreado sem o bairro", async () => {
  const [page, comp] = await Promise.all([read("app/entrega-de-medicamentos-em-sabara/page.tsx"), read("app/entrega-de-medicamentos-em-sabara/EntregaBairro.tsx")]);
  assert.match(page, /<EntregaBairro \/>/);
  assert.match(comp, /<label htmlFor="entrega-bairro-campo">/);
  assert.match(comp, /aria-live="polite"/);
  assert.match(comp, /data-track-source="entrega_bairro"/);
  assert.doesNotMatch(comp, /fetch\(|XMLHttpRequest|viacep/i);
  assert.doesNotMatch(comp, /data-track-(bairro|neighborhood|cep)/i);
});
