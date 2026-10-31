import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClickReport,
  isObviousBot,
  lastDays,
  parseClickBody,
} from "../app/click-counter-rules.ts";

const allowed = new Set(["/", "/ifood", "/fatima"]);

test("ignora bots óbvios e user agent vazio", () => {
  assert.equal(isObviousBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isObviousBot("Mozilla/5.0 HeadlessChrome/120"), true);
  assert.equal(isObviousBot("curl/8.0"), true);
  assert.equal(isObviousBot(""), true);
  assert.equal(isObviousBot(null), true);
  assert.equal(
    isObviousBot("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36"),
    false,
  );
});

test("aceita só página, botão e loja; descarta qualquer outro campo", () => {
  const parsed = parseClickBody(
    { path: "/ifood", button: "ifood", store: "nacoes_unidas", ip: "1.2.3.4", id: "abc", ua: "x" },
    allowed,
  );
  assert.deepEqual(parsed, { path: "/ifood", button: "ifood", store: "nacoes_unidas" });
  assert.deepEqual(Object.keys(parsed).sort(), ["button", "path", "store"]);
});

test("rejeita botão, página ou corpo inválidos e normaliza loja desconhecida", () => {
  assert.equal(parseClickBody({ path: "/ifood", button: "telefone", store: "geral" }, allowed), null);
  assert.equal(parseClickBody({ path: "/nao-existe", button: "ifood" }, allowed), null);
  assert.equal(parseClickBody({ path: "/interno/metricas", button: "ifood" }, new Set(["/interno/metricas"])), null);
  assert.equal(parseClickBody({ path: "/painel-cliques", button: "ifood" }, new Set(["/painel-cliques"])), null);
  assert.equal(parseClickBody({ path: "/ifood?x=1", button: "ifood" }, allowed), null);
  assert.equal(parseClickBody(null, allowed), null);
  assert.equal(parseClickBody("texto", allowed), null);
  assert.equal(parseClickBody({ path: "/fatima", button: "whatsapp", store: "outra" }, allowed)?.store, "geral");
  assert.equal(parseClickBody({ path: "/fatima/", button: "whatsapp" }, allowed)?.path, "/fatima");
});

test("relatório soma por dia, loja, botão e página nos últimos 30 dias", () => {
  const today = "2026-10-31";
  assert.equal(lastDays(today, 30).length, 30);
  assert.equal(lastDays(today, 30)[0], "2026-10-31");
  assert.equal(lastDays(today, 30)[29], "2026-10-02");
  const report = buildClickReport(
    [
      { day: "2026-10-31", path: "/ifood", button: "ifood", store: "nacoes_unidas", count: 3 },
      { day: "2026-10-31", path: "/fatima", button: "whatsapp", store: "fatima", count: 2 },
      { day: "2026-10-30", path: "/fatima", button: "whatsapp", store: "fatima", count: 1 },
      { day: "2026-08-01", path: "/fatima", button: "whatsapp", store: "fatima", count: 99 },
    ],
    today,
  );
  assert.equal(report.total, 6);
  assert.deepEqual(report.byButton, [
    { button: "whatsapp", total: 3 },
    { button: "ifood", total: 3 },
  ]);
  assert.equal(report.byStore.find((row) => row.store === "fatima").total, 3);
  assert.equal(report.byStore.find((row) => row.store === "nacoes_unidas").ifood, 3);
  assert.equal(report.days[0].total, 5);
  assert.equal(report.days[1].whatsapp, 1);
  assert.equal(report.byPath[0].path, "/ifood");
});
