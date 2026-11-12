import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("o que mudou no painel: a sincronização grava, o painel lê e o arquivo não leva estoque nem código de barras", async () => {
  const [sync, flow, rota, painel, arquivo] = await Promise.all([
    ler("ops/catalogo-nacoes/sincronizar.py"),
    ler(".github/workflows/catalogo-sync.yml"),
    ler("app/api/interno/fotos/route.ts"),
    ler("app/components/PainelFotos.tsx"),
    ler("app/nacoes-unidas/produtos/dados/mudancas-recentes.json"),
  ]);
  assert.match(sync, /mudancas\.calcular/);
  assert.match(sync, /mudancas\.gravar/);
  assert.match(flow, /mudancas-recentes\.json/);
  assert.match(rota, /mudancasRecentes\(\)/);
  assert.match(painel, /O que mudou nos últimos dias/);
  const eventos = JSON.parse(arquivo).eventos;
  assert.ok(Array.isArray(eventos));
  for (const e of eventos) {
    assert.ok(["novo", "esgotou", "voltou", "preco"].includes(e.t), e.t);
    assert.deepEqual(Object.keys(e).filter((k) => !["q", "t", "n", "c", "de", "para"].includes(k)), [], "só nome, categoria, tipo e preço");
  }
});
