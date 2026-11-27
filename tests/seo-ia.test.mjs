import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { classificarBotIa, origemReferenciaIa } from "../app/seo-ia/telemetria-ia.ts";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("S-30: separa bots de citação em tempo real de bots de treinamento", () => {
  assert.deepEqual(classificarBotIa("Mozilla/5.0 AppleWebKit/537.36 (compatible; OAI-SearchBot/1.0)"), { tipo: "citacao", bot: "OAI-SearchBot" });
  assert.deepEqual(classificarBotIa("Mozilla/5.0 (compatible; ChatGPT-User/1.0)"), { tipo: "citacao", bot: "ChatGPT-User" });
  assert.deepEqual(classificarBotIa("PerplexityBot/1.0"), { tipo: "citacao", bot: "PerplexityBot" });
  assert.deepEqual(classificarBotIa("Mozilla/5.0 (compatible; GPTBot/1.0)"), { tipo: "treinamento", bot: "GPTBot" });
  assert.deepEqual(classificarBotIa("Google-Extended"), { tipo: "treinamento", bot: "Google-Extended" });
  assert.deepEqual(classificarBotIa("ClaudeBot/1.0"), { tipo: "treinamento", bot: "ClaudeBot" });
  assert.equal(classificarBotIa("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"), null);
});

test("S-28/S-29: identifica referenciadores de assistentes de IA", () => {
  assert.equal(origemReferenciaIa("https://chatgpt.com/"), "chatgpt");
  assert.equal(origemReferenciaIa("https://www.perplexity.ai/search/farmacia-sabara"), "perplexity");
  assert.equal(origemReferenciaIa("https://gemini.google.com/app"), "gemini");
  assert.equal(origemReferenciaIa("https://copilot.microsoft.com/"), "copilot");
  assert.equal(origemReferenciaIa("https://claude.ai/chat/123"), "claude");
  assert.equal(origemReferenciaIa("https://chat.deepseek.com/"), "deepseek");
  assert.equal(origemReferenciaIa("https://www.google.com/"), null);
  assert.equal(origemReferenciaIa("invalido"), null);
});

test("S-28..S-33 e X-4: middleware marca bots/referências, analytics mede só com consentimento, pergunta opcional fora do checkout e governança documentada", async () => {
  const [mw, consent, pergunta, perguntasPage, reserva, gov] = await Promise.all([
    ler("middleware.ts"),
    ler("app/AnalyticsConsent.tsx"),
    ler("app/shop/PerguntaOrigem.tsx"),
    ler("app/perguntas/page.tsx"),
    ler("app/reserva/ReservaFluxo.tsx"),
    ler("docs/governanca-seo-ia.md"),
  ]);
  assert.match(mw, /X-UF-AI-Bot/);
  assert.match(mw, /X-UF-AI-Ref/);
  assert.match(consent, /ai_referral_visit/);
  assert.match(pergunta, /Como você nos conheceu\? \(opcional\)/);
  assert.match(pergunta, /Assistente de IA/);
  assert.match(pergunta, /atribuicao_origem/);
  assert.match(perguntasPage, /<PerguntaOrigem \/>/);
  // P-10 / S-31: pergunta de atribuição nunca entra no caminho do checkout.
  assert.doesNotMatch(reserva, /PerguntaOrigem/);
  assert.match(gov, /S-33/);
  assert.match(gov, /Semanal/);
  assert.match(gov, /Mensal/);
  assert.match(gov, /Trimestral/);
});
