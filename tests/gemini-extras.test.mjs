import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const S = await import("../app/ia-sugestao-nucleo.ts");
const B = await import("../app/busca-intencao-nucleo.ts");
const I = await import("../app/busca-ia-nucleo.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const CATS = ["Medicamentos", "Dermocosméticos", "Beleza", "Cuidado Diário"];
const ctx = { original: "SH PANTENE 400ML HID", categorias: CATS, permitirDescricao: true };

test("sugestão: aceita campos bons e descarta os que quebram as regras", () => {
  const ok = S.limparSugestao(JSON.stringify({ nome: "Shampoo Pantene 400 ml Hidratação", marca: "Pantene", categoria: "cuidado diario", descricao: "Shampoo Pantene de 400 ml, linha hidratação, para uso diário no cabelo." }), ctx);
  assert.equal(ok.categoria, "Cuidado Diário");
  assert.equal(ok.marca, "Pantene");
  assert.ok(ok.nome && ok.descricao);
  // número inventado, promessa e categoria fora da lista caem; o resto passa
  const ruim = S.limparSugestao({ nome: "Shampoo Pantene 500 ml", marca: "Pantene", categoria: "Inventada", descricao: "Shampoo que cura a caspa e ajuda o cabelo a ficar melhor em 7 dias." }, ctx);
  assert.deepEqual(ruim, { marca: "Pantene" });
  assert.equal(S.limparSugestao({ nome: "", marca: "", categoria: "", descricao: "" }, ctx), null);
  assert.equal(S.limparSugestao("lixo", ctx), null);
});

test("sugestão: sem permissão não vem descrição (medicamento, NBCAL, fórmula)", () => {
  const r = S.limparSugestao({ marca: "EMS", descricao: "Comprimido EMS de 500 mg em caixa com vinte unidades para venda." }, { ...ctx, permitirDescricao: false, original: "DIPIRONA 500MG" });
  assert.deepEqual(r, { marca: "EMS" });
});

test("busca por intenção: vocabulário só com palavras de produto e resposta só dentro dele", () => {
  const v = B.vocabularioDeProdutos(["SHAMPOO ANTICASPA 400ML", "SHAMPOO PANTENE 200ML", "FRALDA PAMPERS 30 UN", "ESCOVA DENTAL COM 2"]);
  assert.ok(v.includes("shampoo") && v.includes("anticaspa") && v.includes("fralda"));
  assert.ok(!v.includes("400ml") && !v.includes("com"));
  assert.equal(v[0], "shampoo", "mais frequente primeiro");
  const r = I.limparRespostaIA('{"termos":["anticaspa","dipirona","remedio"],"sintoma":false}', v);
  assert.deepEqual(r.termos, ["anticaspa"]);
  assert.deepEqual(I.limparRespostaIA({ termos: ["shampoo"], sintoma: true }, v), { termos: [], sintoma: true });
});

test("rotas: sugestão é só da equipe e não grava; intenção exclui medicamento e só roda com a chave", async () => {
  const mw = await ler("middleware.ts");
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
  const sug = await ler("app/api/interno/ia/sugerir/route.ts");
  assert.match(sug, /descricaoNaoPermitida\(original\)/);
  assert.ok(!/definir(Descricao|Marca|Nome)|\.run\(\)/.test(sug), "sugestão nunca grava");
  const busca = await ler("app/api/busca-ia/route.ts");
  assert.match(busca, /!i\.isMIP && i\.categoria !== "Medicamentos"/);
  assert.match(busca, /intencao && !chaveGemini/);
  const painel = await ler("app/components/PainelFotos.tsx");
  assert.match(painel, /Sugerir com IA/);
  assert.match(painel, /Revise e aperte Confirmar/);
});
