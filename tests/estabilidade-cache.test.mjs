import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("next.config não tem catch-all max-age=0 que sobrescreva feed e catálogo", async () => {
  const cfg = await ler("next.config.ts");
  assert.doesNotMatch(cfg, /source: "\/:path\*"[\s\S]{0,120}max-age=0/);
  assert.match(cfg, /source: "\/feeds\/google-shopping\.xml"[\s\S]{0,200}max-age=3600/);
  assert.match(cfg, /source: "\/api\/catalogo"[\s\S]{0,200}max-age=300/);
});

test("middleware: HTML público tem s-maxage curto; reserva, painel e sessão ficam no-store", async () => {
  const mw = await ler("middleware.ts");
  assert.match(mw, /CACHE_HTML_PUBLICO = "public, s-maxage=60, stale-while-revalidate=300"/);
  assert.match(mw, /pathname\.startsWith\("\/reserva"\)/);
  assert.match(mw, /pathname === "\/api\/pre-vendas"/);
  assert.match(mw, /STAFF_COOKIE\)\?\.value\) return "no-store"/);
  assert.match(mw, /pathname\.startsWith\("\/feeds\/"\)/);
});
