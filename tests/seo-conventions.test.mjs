import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sitemap uses explicit lastUpdated dates instead of Date.now", async () => {
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /PAGE_LAST_UPDATED/);
  assert.match(sitemap, /sitemapDate/);
  assert.doesNotMatch(sitemap, /const now = new Date\(\)/);
  assert.match(sitemap, /article\.publishedAt/);
});

test("robots.txt does not advertise a non-standard host directive", async () => {
  const robots = await readFile(new URL("../app/robots.ts", import.meta.url), "utf8");
  assert.match(robots, /sitemap:/);
  assert.doesNotMatch(robots, /\bhost:/);
});

test("public pages declare relative canonicals", async () => {
  const files = [
    ["app/page.tsx", 'canonical: "/"'],
    ["app/ofertas/page.tsx", 'canonical: "/ofertas"'],
    ["app/receita/page.tsx", 'canonical: "/receita"'],
    ["app/fatima/page.tsx", 'canonical: "/fatima"'],
    ["app/nacoes-unidas/page.tsx", 'canonical: "/nacoes-unidas"'],
    ["app/itacolomi/page.tsx", 'canonical: "/itacolomi"'],
    ["app/institucional/page.tsx", 'canonical: "/institucional"'],
    ["app/perguntas/page.tsx", 'canonical: "/perguntas"'],
    ["app/encarte/page.tsx", 'canonical: "/encarte"'],
    ["app/farmacia-em-sabara/page.tsx", "canonical: `/${config.slug}`"],
    ["app/farmacia-aberta-domingo-sabara/page.tsx", 'canonical: "/farmacia-aberta-domingo-sabara"'],
    ["app/entrega-de-medicamentos-em-sabara/page.tsx", "canonical: `/${SLUG}`"],
    ["app/perfumaria-em-sabara/page.tsx", "canonical: `/${config.slug}`"],
  ];

  for (const [file, snippet] of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(snippet), file);
    assert.doesNotMatch(source, /canonical: `\$\{SITE_URL\}/);
  }
});

test("only Nações Unidas declares free parking", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  assert.deepEqual(UNITS.filter((u) => u.amenities?.freeParking).map((u) => u.id), ["nacoes"]);
});

test("delivery areas match owner-confirmed list", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  const map = Object.fromEntries(UNITS.map((u) => [u.id, u.deliveryAreas]));
  assert.deepEqual(map, { fatima: ["Nossa Senhora de Fátima", "Jardim Vitória"], nacoes: ["Nações Unidas"], itacolomi: ["Itacolomi"] });
});

test("redirects permanentes apontam para URLs canonicas, sem cadeia e sem sair do sitemap", async () => {
  const config = (await import("../next.config.ts")).default;
  const redirects = await config.redirects();
  const sources = new Set(redirects.map((r) => r.source));
  const canonicalStores = ["/fatima", "/nacoes-unidas", "/itacolomi"];

  for (const r of redirects) {
    assert.equal(r.permanent, true, `${r.source} deve ser redirect permanente`);
    const target = r.destination.split("#")[0];
    assert.ok(!sources.has(target), `${r.source} -> ${r.destination} cai em outro redirect`);
  }
  for (const store of canonicalStores) {
    assert.ok(!sources.has(store), `${store} e canonical e nao pode redirecionar`);
  }
  for (const source of ["/unidades/nossa-senhora-de-fatima", "/unidades/nacoes-unidas", "/unidades/itacolomi"]) {
    assert.ok(sources.has(source), `${source} precisa de redirect permanente`);
  }

  const structured = await readFile(new URL("../app/structured-data.ts", import.meta.url), "utf8");
  for (const store of canonicalStores) {
    assert.ok(structured.includes(`"${store}"`), `${store} deve ser o caminho publico da loja`);
  }
  assert.doesNotMatch(structured, /\/unidades\//);

  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sitemap, /\/unidades\//);
  for (const source of sources) {
    assert.ok(!sitemap.includes(`SITE_URL}${source}\``), `${source} nao pode estar no sitemap`);
  }
});
