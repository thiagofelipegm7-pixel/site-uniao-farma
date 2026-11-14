import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("o site não mostra o aviso amarelo 'Preços e estoque de X atrás'", async () => {
  const [header, css] = await Promise.all([readFile(new URL("../app/shop/ShopHeader.tsx", import.meta.url), "utf8"), readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8")]);
  assert.doesNotMatch(header, /AvisoDadosAntigos/);
  assert.doesNotMatch(css, /\.shop-aviso-dados/);
  await assert.rejects(readFile(new URL("../app/shop/AvisoDadosAntigos.tsx", import.meta.url)), /ENOENT/);
});
