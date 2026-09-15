import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps accessibility, contrast and tap-target hooks in source", async () => {
  const [layout, page, theme, globals, units] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/theme.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/DirectUnitLinks.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /lang="pt-BR"/);
  assert.match(layout, /<SkipLink\s*\/>/);
  assert.match(layout, /id="conteudo"/);
  assert.match(layout, /themeColor: "#0e7370"/);
  assert.match(page, /aria-expanded/);
  assert.match(page, /<h1/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(theme, /:focus-visible/);
  assert.match(theme, /skip-link:focus/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce/);
  assert.match(globals, /min-height:\s*48px/);
  assert.match(units, /trackWhatsAppClick/);
  assert.match(units, /buildWhatsAppUrl/);
});
