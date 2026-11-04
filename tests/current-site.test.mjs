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

test("home: 'Navegue por categoria' é um carrossel como o da Panvel (setas, 2 quadros por clique, volta infinita) e rola no celular", async () => {
  const [sec, css] = await Promise.all([
    readFile(new URL("../app/shop/ShopSections.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8"),
  ]);
  assert.match(sec, /const VISIVEIS = 6/);
  assert.match(sec, /const PASSO = 2/);
  assert.match(sec, /aria-label="Categorias anteriores"/);
  assert.match(sec, /aria-label="Próximas categorias"/);
  assert.match(sec, /prefers-reduced-motion: reduce/);
  assert.match(sec, /aria-hidden=\{copia \? true : undefined\}/);
  // No celular: sem setas e sem cópias; no desktop: janela de 5 quadros.
  assert.match(css, /\.shop-cat-seta, \.shop-cat-copia \{ display: none; \}/);
  assert.match(css, /\.shop-categorias-janela \{ overflow: hidden; width: calc\(5 \* var\(--cat-tile\) \+ 4 \* var\(--cat-gap\)\); \}/);
});
