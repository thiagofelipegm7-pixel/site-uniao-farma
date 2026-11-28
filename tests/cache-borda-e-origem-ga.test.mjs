import assert from "node:assert/strict";
import test from "node:test";
import { CACHE_CONTROL_HTML_PUBLICO, decidirCacheBorda, respostaPodeSerGuardada } from "../app/seo-ia/cache-borda.ts";
import { semParametrosReservadosGa4 } from "../app/analytics.ts";

const pedido = (url, cabecalhos = {}, method = "GET") => ({
  method,
  url,
  headers: { get: (nome) => cabecalhos[nome.toLowerCase()] ?? null },
});
const SITE = "https://xn--uniofarmasabar-8gbu.com.br";

test("hub, produto e departamento anônimos entram no cache de borda", () => {
  assert.deepEqual(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`)), { chave: `${SITE}/nacoes-unidas/produtos`, ttl: 300 });
  assert.equal(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos/?utm_source=x&q=1`))?.chave, `${SITE}/nacoes-unidas/produtos`);
  assert.equal(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos/dipirona-500mg`))?.ttl, 120);
  assert.equal(decidirCacheBorda(pedido(`${SITE}/departamentos/beleza?pagina=2&q=a`))?.chave, `${SITE}/departamentos/beleza?pagina=2&q=a`);
  assert.equal(decidirCacheBorda(pedido(`${SITE}/departamentos/beleza?q=a&pagina=2`))?.chave, `${SITE}/departamentos/beleza?pagina=2&q=a`);
});

test("robôs de IA não são tratados à parte: o user-agent não muda a decisão", () => {
  const gpt = decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`, { "user-agent": "GPTBot/1.2" }));
  const humano = decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`, { "user-agent": "Mozilla/5.0" }));
  assert.deepEqual(gpt, humano);
  assert.ok(gpt);
});

test("o que tem identidade, é navegação RSC ou não é GET passa direto", () => {
  assert.equal(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`, { cookie: "a=b" })), null);
  assert.equal(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`, { authorization: "Bearer x" })), null);
  assert.equal(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`, { rsc: "1" })), null);
  assert.equal(decidirCacheBorda(pedido(`${SITE}/nacoes-unidas/produtos`, {}, "POST")), null);
});

test("rotas fora da lista não entram (home, painel, API, receita)", () => {
  for (const caminho of ["/", "/fatima", "/painel", "/api/estoque", "/nacoes-unidas", "/nacoes-unidas/produtos/a/b", "/_vinext/image"]) {
    assert.equal(decidirCacheBorda(pedido(`${SITE}${caminho}`)), null, caminho);
  }
});

test("só guarda 200 em HTML público, sem cookie", () => {
  const resp = (status, cab) => ({ status, headers: { get: (n) => cab[n.toLowerCase()] ?? null } });
  const ok = { "content-type": "text/html; charset=utf-8", "cache-control": CACHE_CONTROL_HTML_PUBLICO };
  assert.equal(respostaPodeSerGuardada(resp(200, ok)), true);
  assert.equal(respostaPodeSerGuardada(resp(503, ok)), false);
  assert.equal(respostaPodeSerGuardada(resp(404, ok)), false);
  assert.equal(respostaPodeSerGuardada(resp(200, { ...ok, "set-cookie": "a=b" })), false);
  assert.equal(respostaPodeSerGuardada(resp(200, { ...ok, "cache-control": "no-store" })), false);
  assert.equal(respostaPodeSerGuardada(resp(200, { ...ok, "content-type": "application/json" })), false);
  assert.equal(respostaPodeSerGuardada(resp(200, { ...ok, vary: "*" })), false);
});

test("parâmetros de evento que o GA4 leria como origem de tráfego ganham prefixo link_", () => {
  const limpos = semParametrosReservadosGa4({ source: "produtos_nacoes", medium: "x", campaign: "y", store: "nacoes_unidas", link_location: "home" });
  assert.equal(limpos.source, undefined);
  assert.equal(limpos.medium, undefined);
  assert.equal(limpos.campaign, undefined);
  assert.equal(limpos.link_source, "produtos_nacoes");
  assert.equal(limpos.link_medium, "x");
  assert.equal(limpos.store, "nacoes_unidas");
  assert.equal(limpos.link_location, "home");
});
