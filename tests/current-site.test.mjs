import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public store routes stay on one URL each", async () => {
  const [fatima, nacoes, itacolomi, sitemap, footer, company] = await Promise.all([
    readFile(new URL("../app/fatima/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/nacoes-unidas/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/itacolomi/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteFooter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/company.ts", import.meta.url), "utf8"),
  ]);

  assert.match(fatima, /\/fatima/);
  assert.match(nacoes, /\/nacoes-unidas/);
  assert.match(itacolomi, /\/itacolomi/);
  assert.match(sitemap, /\/institucional/);
  // Rodapé do protótipo: privacidade, termos e perguntas (a página institucional segue no sitemap).
  assert.match(footer, /\/privacidade/);
  assert.match(footer, /\/termos/);
  assert.match(company, /28\.455\.556\/0001-91/);
});

test("home: cabeçalho que encolhe ao rolar e pílula de abas fixa, só no desktop e com movimento reduzido respeitado", async () => {
  const [home, comp, css] = await Promise.all([
    readFile(new URL("../app/HomePage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/CabecalhoInteligente.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8"),
  ]);
  assert.match(home, /<CabecalhoInteligente>[\s\S]*<ShopHeader \/>[\s\S]*<SubmenuHome \/>[\s\S]*<\/CabecalhoInteligente>/);
  assert.match(comp, /dataset\.cabRolado/);
  assert.match(comp, /passive: true/);
  assert.match(css, /html\[data-cab-rolado="sim"\] \.cab-fixo \.shop-faixa-topo/);
  assert.match(css, /html\[data-cab-rolado="sim"\] \.cab-fixo \.shop-submenu/);
  assert.match(css, /\.shop-abas \{ position: sticky;/);
  assert.match(css, /\.cab-espaco, \.cab-fixo \{ display: contents; \}/);
  assert.match(css, /@media \(min-width: 992px\) and \(prefers-reduced-motion: reduce\)/);
});
