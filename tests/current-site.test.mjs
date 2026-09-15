import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public store routes stay on one URL each", async () => {
  const [fatima, nacoes, itacolomi, sitemap, footer] = await Promise.all([
    readFile(new URL("../app/fatima/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/nacoes-unidas/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/itacolomi/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteFooter.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(fatima, /canonical: `\$\{SITE_URL\}\/fatima`/);
  assert.match(nacoes, /canonical: `\$\{SITE_URL\}\/nacoes-unidas`/);
  assert.match(itacolomi, /canonical: `\$\{SITE_URL\}\/itacolomi`/);
  assert.match(sitemap, /\/institucional/);
  assert.match(footer, /\/institucional/);
  assert.match(footer, /28\.455\.556\/0001-91/);
});
