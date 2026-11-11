import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analisarPlanilha, lerCsv } from "../ops/importar-planilha/importar.mjs";

const csv = readFileSync(new URL("./fixtures/planilha-fornecedor.csv", import.meta.url), "utf8");
const FONTE = "https://fornecedor.exemplo.com.br";

test("importação da planilha: lê CSV com ; e aspas e reconhece as colunas pelo cabeçalho", () => {
  const l = lerCsv('Cod;Descrição\n1;"a; b ""c"""\n');
  assert.deepEqual(l[1], ["1", 'a; b "c"']);
});

test("importação da planilha: aceita só produto comum do catálogo, com texto sem promessa e com fonte https", () => {
  const ok = analisarPlanilha(csv, { fonte: FONTE, existentes: {} });
  assert.deepEqual(Object.keys(ok.aceitas), ["masc-dove-nutricao-tri-oleo-500g"]);
  assert.equal(ok.aceitas["masc-dove-nutricao-tri-oleo-500g"].conf, "media");
  assert.equal(ok.aceitas["masc-dove-nutricao-tri-oleo-500g"].fonte, FONTE);
  assert.ok(ok.recusadas.some((r) => r.motivo === "código não está no catálogo"));
  const semFonte = analisarPlanilha(csv, { existentes: {} });
  assert.equal(Object.keys(semFonte.aceitas).length, 0);
  assert.ok(semFonte.recusadas.some((r) => /sem fonte https/.test(r.motivo)));
  const repetida = analisarPlanilha(csv, { fonte: FONTE, existentes: { "masc-dove-nutricao-tri-oleo-500g": {} } });
  assert.ok(repetida.recusadas.some((r) => /já tem descrição/.test(r.motivo)));
  assert.equal(Object.keys(analisarPlanilha(csv, { fonte: FONTE, existentes: { "masc-dove-nutricao-tri-oleo-500g": {} }, substituir: true }).aceitas).length, 1);
});

test("importação da planilha: recusa promessa de efeito", () => {
  const prom = analisarPlanilha("EAN;Descrição\n7891150096752;Máscara que cura o cabelo ressecado em 48 horas, uso diário.\n", { fonte: FONTE, existentes: {} });
  assert.ok(prom.recusadas[0].motivo.startsWith("promessa de efeito"));
});
