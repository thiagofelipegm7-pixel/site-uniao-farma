import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps accessibility, contrast and tap-target hooks in source", async () => {
  const [layout, page, contrast, pending, globals, units] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contrast.css", import.meta.url), "utf8"),
    readFile(new URL("../app/pending.css", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/DirectUnitLinks.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /lang="pt-BR"/);
  assert.match(layout, /skip-link/);
  assert.match(layout, /id="conteudo"/);
  assert.match(layout, /themeColor: "#0b6244"/);
  assert.match(page, /aria-expanded/);
  assert.match(page, /<h1/);
  assert.equal((page.match(/<h1\b/g) ?? []).length, 1);
  assert.match(contrast, /:focus-visible/);
  assert.match(pending, /skip-link:focus/);
  assert.match(globals, /prefers-reduced-motion:\s*reduce/);
  assert.match(globals, /min-height:\s*48px/);
  assert.match(units, /whatsapp_click/);
  assert.match(units, /buildWhatsAppUrl/);
});
