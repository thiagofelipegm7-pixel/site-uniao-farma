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

test("home: 'Navegue por categoria' é faixa horizontal com cards menores e scroll-snap", async () => {
  const [sec, css] = await Promise.all([
    readFile(new URL("../app/shop/ShopSections.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8"),
  ]);
  assert.match(sec, /shop-categorias-trilho/);
  assert.match(sec, /Navegue por categoria/);
  assert.match(sec, /\/categorias\/medicamentos\.jpg/);
  // Pedido da loja: sem card "Ofertas" na faixa (página /ofertas permanece).
  assert.doesNotMatch(sec, /rotulo: "Ofertas"/);
  assert.doesNotMatch(sec, /href: "\/ofertas"/);
  assert.doesNotMatch(sec, /is-oferta/);
  assert.doesNotMatch(sec, /const VISIVEIS/);
  assert.doesNotMatch(sec, /shop-cat-seta/);
  // Cards ~92px no mobile (~29% menores), snap e scrollbar oculta.
  assert.match(css, /--cat-tile: 5\.75rem/);
  assert.match(css, /scroll-snap-type: x mandatory/);
  assert.match(css, /scrollbar-width: none/);
  assert.match(css, /\.shop-categorias-trilho::-webkit-scrollbar \{ display: none; \}/);
  assert.match(css, /border-radius: 1rem/);
  // Protege contra "main li > a { display: inline-flex !important }" de design.css.
  assert.match(css, /main \.shop-categorias li > a/);
  assert.match(css, /display: grid !important/);
});


test("header: cesta 3D com fundo transparente e badge coral circular", async () => {
  const [icons, sacola, overrides, modal] = await Promise.all([
    readFile(new URL("../app/reserva/ReservaIcons.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reserva/ReservaSacola.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/overrides.css", import.meta.url), "utf8"),
    readFile(new URL("../app/reserva/cesta-modal.css", import.meta.url), "utf8"),
  ]);
  assert.match(icons, /export function IconCestaArte/);
  assert.match(icons, /\/icons\/cesta\.png/);
  assert.match(sacola, /IconCestaArte/);
  assert.match(sacola, /cm-vazia-icone/);
  assert.match(sacola, /reserva-sacola-icone/);
  assert.match(sacola, /size=\{34\}/);
  assert.doesNotMatch(sacola, /<IconCesta /);
  const arte = await readFile(new URL("../public/icons/cesta.png", import.meta.url));
  assert.ok(arte.length > 1000);
  assert.equal(arte.subarray(0, 8).toString("binary"), "\x89PNG\r\n\x1a\n");
  // Botões de adicionar dos cards continuam com a cesta preenchida.
  const botao = await readFile(new URL("../app/reserva/ReservarBotao.tsx", import.meta.url), "utf8");
  assert.match(botao, /IconCesta/);
  assert.match(overrides, /border-radius: 999px/);
  assert.match(overrides, /--uf-offer/);
  assert.match(overrides, /reserva-sacola-icone/);
  assert.match(overrides, /top: -0\.375rem/);
  assert.match(overrides, /right: -0\.5rem/);
  assert.match(overrides, /border: 1\.5px solid #ffffff !important/);
  assert.match(modal, /align-items: center/);
  assert.match(modal, /cm-vazia-icone/);
});





test("busca: painel Termos mais buscados no campo vazio (1º–10º)", async () => {
  const [header, busca, css] = await Promise.all([
    readFile(new URL("../app/shop/ShopHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/nacoes-unidas/produtos/busca.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8"),
  ]);
  assert.match(header, /Termos mais buscados/);
  assert.match(header, /shop-sugestoes-termos/);
  assert.match(header, /role="listbox"/);
  assert.match(header, /10º/);
  assert.match(busca, /Lista curada manualmente/);
  assert.match(busca, /"dipirona"/);
  assert.match(css, /#0c9b90/);
  assert.match(css, /#e4f6f3/);
  assert.match(css, /main \.shop-sugestoes li > a/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.match(css, /\.shop-busca input:focus-visible/);
});

test("home: sem painel de abas Para você / Saúde / Beleza", async () => {
  const [home, blocos] = await Promise.all([
    readFile(new URL("../app/HomePage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/HomeBlocos.tsx", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(home, /AbasHome/);
  assert.doesNotMatch(home, /shop-abas/);
  assert.doesNotMatch(blocos, /export function AbasHome/);
  // Departamentos Saúde/Beleza continuam acessíveis pela faixa de categorias / gaveta.
  assert.match(await readFile(new URL("../app/shop/ShopSections.tsx", import.meta.url), "utf8"), /departamentos\/medicamentos/);
  assert.match(await readFile(new URL("../app/shop/ShopSections.tsx", import.meta.url), "utf8"), /departamentos\/beleza/);
});

test("submenu desktop: sem Enviar para e sem Ofertas Exclusivas; Departamentos permanece", async () => {
  const src = await readFile(new URL("../app/shop/HomeBlocos.tsx", import.meta.url), "utf8");
  assert.match(src, /export function SubmenuHome/);
  assert.match(src, /Departamentos/);
  assert.doesNotMatch(src, /Enviar para/);
  assert.doesNotMatch(src, /Ofertas Exclusivas/);
  assert.doesNotMatch(src, /shop-submenu-loja/);
  // Página /ofertas continua no site (não removemos a rota).
  assert.match(await readFile(new URL("../app/ofertas/page.tsx", import.meta.url), "utf8"), /ofertas/i);
});

test("header desktop: botão \"Pedir no WhatsApp\" sem número, só da loja Nações Unidas, e sem o bloco antigo com número", async () => {
  const [header, css] = await Promise.all([
    readFile(new URL("../app/shop/ShopHeader.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8"),
  ]);
  // Decisão atual: o cabeçalho tem um botão curto de pedido pelo WhatsApp (sem exibir o número), só no desktop.
  assert.match(header, /className="shop-whats"/);
  assert.match(header, /data-track-source="cabecalho"/);
  assert.match(css, /grid-area: whats/);
  const botao = header.slice(header.indexOf('className="shop-whats"'), header.indexOf("</a>", header.indexOf('className="shop-whats"')));
  assert.doesNotMatch(botao, /\(31\)|98762|whatsapp\.number|\.whatsapp\b/, "o botão não mostra o número");
  // Fátima e Itacolomi não oferecem pedido: o botão não aparece nelas.
  assert.match(header, /\^\\\/\(fatima\|itacolomi\)/);
  // A busca vazia ainda pode oferecer WhatsApp; a cesta e o FAB permanecem.
  assert.match(header, /busca_vazia_cabecalho/);
});

test("celular: a barra de atalhos da loja tem 4 colunas e não cobre o aviso de cookies", async () => {
  const css = await readFile(new URL("../app/design.css", import.meta.url), "utf8");
  assert.match(css, /\.mobile-quick-nav-inner\.is-shop \{ grid-template-columns: repeat\(4, minmax\(min-content, 1fr\)\) !important; \}/);
});
