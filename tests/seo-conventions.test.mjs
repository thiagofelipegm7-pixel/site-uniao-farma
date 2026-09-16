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
  ];

  for (const [file, snippet] of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(snippet), file);
    assert.doesNotMatch(source, /canonical: `\$\{SITE_URL\}/);
  }
});
