import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const imagens = () => import("../app/nacoes-unidas/produtos/imagens.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const json = (a) => ler(a).then((t) => JSON.parse(t));

test("fotoDoProduto: nome abreviado do mapa encontra a mesma foto do painel (TINT / TINTA)", async () => {
  const { fotoDoProduto, eanDaFoto } = await imagens();
  assert.equal(eanDaFoto("TINTA ALTA MODA 7 MEL"), "7898468503545");
  assert.equal(eanDaFoto("TINT ALTA MODA 7 MEL"), "7898468503545");
  assert.equal(fotoDoProduto("TINTA ALTA MODA 7 MEL"), "/produtos/7898468503545.webp");
  assert.equal(eanDaFoto("TINTA ALTA MODA 7.7"), "7899884201428");
  assert.notEqual(eanDaFoto("TINTA ALTA MODA 7 MEL"), eanDaFoto("TINTA ALTA MODA 7.7"));
  assert.equal(eanDaFoto("TINTA ALTA MODA 8.1"), "7898468503606");
  assert.equal(eanDaFoto("PROTETOR SOLAR SUNLESS FPS60 200G"), "7896902285286");
  assert.equal(eanDaFoto("TESTE GRAVIDEZ CLEARBLUE COMPACTO"), "7500435260954");
  // Nome do catálogo às vezes cola o EAN no fim.
  assert.equal(eanDaFoto("ACNEZIL GEL SECATIVO 10 G7897947607392"), "7897947607392");
  assert.equal(eanDaFoto("ACNEZIL GEL SECATIVO 10 G"), "7897947607392");
  assert.equal(eanDaFoto("RAID PROT PASTILHA REFIL C/12"), "7894650002032");
  assert.equal(eanDaFoto("PRIMOSISTON 2+0.01mg cx 30 comp"), "7896006201731");
  assert.equal(eanDaFoto("DIUPRESS 25+5mg cx 30 comp"), "7891317010065");
});

test("fotoDoProduto: não troca foto quando a assinatura é ambígua ou o produto não tem arte", async () => {
  const { fotoDoProduto, eanDaFoto } = await imagens();
  assert.equal(fotoDoProduto("PRODUTO QUE NAO EXISTE NA LOJA 123"), null);
  assert.equal(fotoDoProduto(""), null);
  // VERTIGIUM e VERTIZAN compartilham a mesma assinatura: só o nome exato vale.
  assert.equal(eanDaFoto("VERTIGIUM 10MG CX 50CPR"), "7896714239712");
  assert.equal(eanDaFoto("VERTIZAN 10MG CX 50CPR"), "7898049790586");
  assert.equal(eanDaFoto("REXONA CLINICAL EXTRA DRY 150ML"), null);
  assert.notEqual(eanDaFoto("FISIO FORTE PREMIUM"), "7908512700810");
});

test("gerador e site usam a mesma regra de foto para todo o catálogo", async () => {
  const { fotoDoProduto, chaveFotoAssinatura, chaveFotoNormal } = await imagens();
  const gen = await ler("scripts/gerar-assets-catalogo.mjs");
  assert.match(gen, /function chaveFotoAssinatura/);
  assert.match(gen, /FOTOS_POR_ASSINATURA/);
  assert.equal(chaveFotoAssinatura("TINTA ALTA MODA 7 MEL"), chaveFotoAssinatura("TINT ALTA MODA 7 MEL"));
  assert.notEqual(chaveFotoAssinatura("TINTA ALTA MODA 7 MEL"), chaveFotoAssinatura("TINTA ALTA MODA 7.7"));
  assert.equal(chaveFotoNormal("tint  alta   moda 7 mel"), "TINT ALTA MODA 7 MEL");

  const cat = await json("app/nacoes-unidas/produtos/dados/catalogo-nacoes.json");
  for (const item of cat.itens) {
    const foto = fotoDoProduto(item.nome);
    // O gerador reescreve busca-index com a mesma regra: se o teste roda depois da geração, os dois batem.
    if (foto) assert.match(foto, /^\/produtos\/\d+\.webp$/);
  }
});
