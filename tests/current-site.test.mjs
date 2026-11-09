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
  assert.doesNotMatch(css, /shop-faixa-topo/);
  assert.match(css, /html\[data-cab-rolado="sim"\] \.cab-fixo \.shop-submenu/);
  assert.match(css, /\.shop-abas \{ position: sticky;/);
  assert.match(css, /\.cab-espaco, \.cab-fixo \{ display: contents; \}/);
  assert.match(css, /@media \(min-width: 992px\) and \(prefers-reduced-motion: reduce\)/);
});

test("home: 'Navegue por categoria' é faixa horizontal com cards grandes e scroll-snap", async () => {
  const [sec, css] = await Promise.all([
    readFile(new URL("../app/shop/ShopSections.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8"),
  ]);
  assert.match(sec, /shop-categorias-trilho/);
  assert.match(sec, /Navegue por categoria/);
  assert.match(sec, /icons\/categorias\/medicamentos\.webp/);
  // Pedido da loja: sem card "Ofertas" na faixa (página /ofertas permanece).
  assert.doesNotMatch(sec, /rotulo: "Ofertas"/);
  assert.doesNotMatch(sec, /href: "\/ofertas"/);
  assert.doesNotMatch(sec, /is-oferta/);
  assert.doesNotMatch(sec, /const VISIVEIS/);
  assert.doesNotMatch(sec, /shop-cat-seta/);
  // Cards ~130px no mobile, snap e scrollbar oculta.
  assert.match(css, /--cat-tile: 8\.125rem/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /scrollbar-width: none/);
  assert.match(css, /\.shop-categorias-trilho::-webkit-scrollbar \{ display: none; \}/);
  assert.match(css, /border-radius: 1\.25rem/);
  // Protege contra "main li > a { display: inline-flex !important }" de design.css.
  assert.match(css, /main \.shop-categorias li > a/);
  assert.match(css, /display: grid !important/);
});


test("header: cesta em contorno no estilo das categorias, badge coral circular", async () => {
  const [icons, sacola, overrides] = await Promise.all([
    readFile(new URL("../app/reserva/ReservaIcons.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reserva/ReservaSacola.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/overrides.css", import.meta.url), "utf8"),
  ]);
  assert.match(icons, /export function IconCestaLinha/);
  assert.match(icons, /strokeLinecap="round"/);
  assert.match(icons, /strokeLinejoin="round"/);
  assert.match(icons, /strokeWidth="16"/);
  assert.match(sacola, /IconCestaLinha/);
  assert.doesNotMatch(sacola, /<IconCesta /);
  // Botões de adicionar dos cards continuam com a cesta preenchida.
  const botao = await readFile(new URL("../app/reserva/ReservarBotao.tsx", import.meta.url), "utf8");
  assert.match(botao, /IconCesta/);
  assert.match(overrides, /border-radius: 999px/);
  assert.match(overrides, /--uf-offer/);
});

test("celular: a barra de atalhos da loja tem 4 colunas e não cobre o aviso de cookies", async () => {
  const css = await readFile(new URL("../app/design.css", import.meta.url), "utf8");
  assert.match(css, /\.mobile-quick-nav-inner\.is-shop \{ grid-template-columns: repeat\(4, minmax\(min-content, 1fr\)\) !important; \}/);
});
