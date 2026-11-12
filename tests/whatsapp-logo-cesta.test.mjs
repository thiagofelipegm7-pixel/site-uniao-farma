import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("WhatsApp: todos os botões usam o logo oficial (verde em fundo claro, cor do texto em botão colorido)", async () => {
  const [logo, icones, fab, chrome, nav, fluxo, receita, blocos] = await Promise.all([
    ler("app/LogoWhatsApp.tsx"), ler("app/reserva/ReservaIcons.tsx"), ler("app/WhatsAppFab.tsx"), ler("app/home-chrome.tsx"),
    ler("app/MobileQuickNav.tsx"), ler("app/reserva/ReservaFluxo.tsx"), ler("app/receita-foto/LerReceita.tsx"), ler("app/shop/HomeBlocos.tsx"),
  ]);
  assert.match(logo, /"#25D366"/);
  assert.match(logo, /cor === "oficial" \? "#25D366" : "currentColor"/);
  assert.match(icones, /<LogoWhatsApp size=\{size\} cor=\{oficial \? "oficial" : "atual"\} \/>/);
  assert.match(fab, /<LogoWhatsApp size=\{30\} cor="atual" \/>/);
  assert.match(chrome, /<LogoWhatsApp size=\{24\} className="inline-icon" \/>/);
  assert.match(nav, /<LogoWhatsApp size=\{24\} \/>/);
  // Em fundo claro o logo é verde; em botão verde é a cor do texto (para não sumir).
  assert.match(fluxo, /<IconWhats size=\{22\} oficial \/>/);
  assert.match(receita, /<IconWhats size=\{22\} oficial \/>/);
  assert.match(blocos, /<IconWhats size=\{22\} oficial \/>/);
  // O ícone genérico de balão com "=" e o SVG antigo não são mais usados nos botões.
  for (const arq of [fab, chrome, nav]) assert.doesNotMatch(arq, /whatsapp-icon\.svg|M12\.04 2c/);
});

test("cesta do cabeçalho: círculo branco atrás do ícone, no desktop e no celular", async () => {
  const [css, layout] = await Promise.all([ler("app/destaque-cesta.css"), ler("app/layout.tsx")]);
  assert.match(css, /@layer design/);
  assert.match(css, /\.shop-header \.shop-acoes \.reserva-sacola \{\s*background: #ffffff !important;\s*border-radius: 50% !important;/);
  assert.ok(layout.indexOf('import "./destaque-cesta.css"') > layout.indexOf('import "./design.css"'));
});
