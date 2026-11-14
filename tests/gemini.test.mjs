import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const G = await import("../app/gemini-nucleo.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("gemini: corpo do pedido leva instrução, imagem, JSON e nenhum segredo", () => {
  const c = G.montarCorpoGemini({ sistema: "S", texto: "T", imagem: { tipo: "image/jpeg", base64: "AAA" }, maxTokens: 50 });
  assert.equal(c.systemInstruction.parts[0].text, "S");
  assert.equal(c.contents[0].parts[1].inlineData.data, "AAA");
  assert.equal(c.generationConfig.responseMimeType, "application/json");
  assert.equal(c.generationConfig.temperature, 0);
});

test("gemini: resposta lida só quando terminou normal e tem texto", () => {
  const ok = { candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"a":1}' }] } }] };
  assert.equal(G.textoDaRespostaGemini(ok), '{"a":1}');
  assert.equal(G.textoDaRespostaGemini({ candidates: [{ finishReason: "SAFETY" }] }), null);
  assert.equal(G.textoDaRespostaGemini({}), null);
  assert.equal(G.textoDaRespostaGemini(null), null);
});

test("gemini: esquema da Cloudflare vira esquema do Gemini", () => {
  const e = G.esquemaParaGemini({ json_schema: { schema: { type: "object", properties: { t: { type: "array", items: { type: "string" } } }, additionalProperties: false } } });
  assert.equal(e.type, "OBJECT");
  assert.equal(e.properties.t.items.type, "STRING");
  assert.ok(!("additionalProperties" in e));
});

test("gemini: chave no cabeçalho (nunca na URL), erro e tempo viram null", async () => {
  let visto;
  const bom = async (url, init) => { visto = { url, init }; return new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "{}" }] } }] })); };
  const r = await G.chamarGemini({ modelo: "gemini-x", chave: "SEGREDO", texto: "t", maxTokens: 10, ms: 500 }, bom);
  assert.deepEqual(r, { response: "{}" });
  assert.ok(!visto.url.includes("SEGREDO"));
  assert.equal(visto.init.headers["x-goog-api-key"], "SEGREDO");
  assert.equal(await G.chamarGemini({ modelo: "m", chave: "", texto: "t", maxTokens: 1, ms: 50 }, bom), null);
  assert.equal(await G.chamarGemini({ modelo: "m", chave: "k", texto: "t", maxTokens: 1, ms: 50 }, async () => new Response("x", { status: 500 })), null);
  const lento = (_u, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(new Error("abort"))));
  assert.equal(await G.chamarGemini({ modelo: "m", chave: "k", texto: "t", maxTokens: 1, ms: 30 }, lento), null);
});

test("gemini: modelo configurado só vale com nome de modelo Gemini", () => {
  assert.equal(G.modeloEscolhido("gemini-2.5-pro", "p"), "gemini-2.5-pro");
  assert.equal(G.modeloEscolhido("../../x", "p"), "p");
  assert.equal(G.modeloEscolhido(undefined, "p"), "p");
});

test("gemini: rotas usam o segredo, caem na Cloudflare e nunca expõem a chave", async () => {
  for (const f of ["app/api/busca-ia/route.ts", "app/api/receita-ia/route.ts"]) {
    const s = await ler(f);
    assert.match(s, /segredo\("GEMINI_API_KEY"\)/, f);
    assert.match(s, /chamarGemini\(/, f);
    assert.match(s, /!ia && !chaveGemini/, f);
    assert.ok(!/AIza/.test(s), "nenhuma chave no código");
  }
  const rec = await ler("app/api/receita-ia/route.ts");
  assert.match(rec, /MODELO_VISAO_RESERVA/);
});

test("gemini: motivo da falha aparece sem vazar a chave e modelo aposentado cai no -latest", async () => {
  const erro = async () => new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 });
  const r = await G.chamarGeminiComMotivo({ modelo: "gemini-2.5-flash-lite", chave: "SEGREDO", texto: "t", maxTokens: 5, ms: 500 }, erro);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /^http_400: API key not valid/);
  assert.ok(!r.motivo.includes("SEGREDO"));
  const vistos = [];
  const f = async (url) => { vistos.push(url); return vistos.length === 1 ? new Response("{}", { status: 404 }) : new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "{}" }] } }] })); };
  const ok = await G.chamarGeminiComMotivo({ modelo: "gemini-2.5-flash-lite", chave: "k", texto: "t", maxTokens: 5, ms: 500 }, f);
  assert.equal(ok.ok, true);
  assert.match(vistos[1], /gemini-flash-lite-latest/);
  assert.equal(G.modeloDeReserva("gemini-flash-latest"), null);
});
