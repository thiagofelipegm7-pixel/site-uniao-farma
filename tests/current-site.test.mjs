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
  assert.match(sec, /const VISIVEIS = 7/);
  assert.match(sec, /const PASSO = 2/);
  assert.match(sec, /aria-label="Categorias anteriores"/);
  assert.match(sec, /aria-label="Próximas categorias"/);
  assert.match(sec, /prefers-reduced-motion: reduce/);
  assert.match(sec, /aria-hidden=\{copia \? true : undefined\}/);
  // No celular: sem setas e sem cópias; no desktop: janela de --cat-n quadros (5; 7 a partir de 1440 px).
  assert.match(css, /\.shop-cat-seta, \.shop-cat-copia \{ display: none; \}/);
  assert.match(css, /\.shop-categorias-janela \{ overflow: hidden; width: calc\(var\(--cat-n\) \* var\(--cat-tile\) \+ \(var\(--cat-n\) - 1\) \* var\(--cat-gap\)\); \}/);
  assert.match(css, /--cat-tile: calc\(\(100cqw - 7\.75rem/);
  assert.match(css, /--cat-n: 7/);
});

test("celular: a barra de atalhos da loja tem 4 colunas e não cobre o aviso de cookies", async () => {
  const css = await readFile(new URL("../app/design.css", import.meta.url), "utf8");
  assert.match(css, /\.mobile-quick-nav-inner\.is-shop \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important; \}/);
});
