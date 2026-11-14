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

test("descrição pesquisada: precisa trazer informação além do nome e passar nas regras", () => {
  const nome = "ABSORVENTE ALWAYS NOT SECA C/8 UN";
  const boa = "Absorvente externo da linha Always para fluxo noturno, com abas laterais e cobertura seca. Vem em embalagem com 8 unidades e formato mais longo na parte de trás.";
  assert.deepEqual(S.limparDescricaoPesquisada(`<descricao>${boa}</descricao>`, nome), { descricao: boa });
  // Cópia do nome: o que o painel mostrava antes. Reprovada.
  assert.equal(S.limparDescricaoPesquisada("<descricao>Absorvente Always Not Seca com 8 unidades. Produto na quantidade de 8 un. Absorvente Always Not Seca com 8 un, quantidade de 8 unidades do absorvente Always.</descricao>", nome).motivo, "copia_do_nome");
  assert.equal(S.limparDescricaoPesquisada("<descricao>SEM_INFO</descricao>", nome).motivo, "sem_info");
  assert.equal(S.limparDescricaoPesquisada("<descricao>Absorvente com abas que alivia o desconforto e dá proteção por 12 horas, clinicamente testado para uso diário em dias de fluxo intenso.</descricao>", nome).motivo, "regras");
  assert.equal(S.limparDescricaoPesquisada("<descricao>Absorvente externo da linha Always para fluxo noturno, com abas laterais. Vem em embalagem com 16 unidades e cobertura seca.</descricao>", nome).motivo, "numero");
  assert.equal(S.limparDescricaoPesquisada("curto.", nome).motivo, "tamanho");
});

test("pesquisa: pedido usa a busca do Google sem JSON e devolve os sites consultados", async () => {
  const G = await import("../app/gemini-nucleo.ts");
  const c = G.montarCorpoGemini({ modelo: "gemini-2.5-flash", texto: "t", maxTokens: 5, pesquisar: true, esquema: { type: "OBJECT" } });
  assert.deepEqual(c.tools, [{ google_search: {} }]);
  assert.equal(c.generationConfig.responseMimeType, undefined);
  assert.equal(c.generationConfig.responseSchema, undefined);
  const corpo = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "<descricao>x</descricao>" }] }, groundingMetadata: { groundingChunks: [{ web: { title: "always.com.br" } }, { web: { title: "Texto qualquer com espaço" } }, { web: { title: "always.com.br" } }] } }] };
  assert.deepEqual(G.fontesDaRespostaGemini(corpo), ["always.com.br"]);
  const r = await G.chamarGeminiComMotivo({ modelo: "m", chave: "k", texto: "t", maxTokens: 5, ms: 500, pesquisar: true }, async () => new Response(JSON.stringify(corpo)));
  assert.equal(r.ok, true);
  assert.deepEqual(r.fontes, ["always.com.br"]);
});
