import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("cabeçalho do desktop: busca larga e botão de WhatsApp da loja no lugar dos espaços vazios", async () => {
  const [tsx, css] = await Promise.all([ler("app/shop/ShopHeader.tsx"), ler("app/shop/shop.css")]);
  assert.match(tsx, /className="shop-whats"/);
  assert.match(tsx, /buildWhatsAppUrl\(nacoes, "Oi, União Farma Nações Unidas! Quero fazer um pedido\."/);
  assert.match(tsx, /data-track-event="whatsapp_click"[\s\S]*data-track-source="cabecalho"/);
  assert.match(tsx, /aria-label="Pedir pelo WhatsApp da loja Nações Unidas"/);
  // Logo oficial do WhatsApp (verde #25D366), não o ícone genérico de balão.
  assert.match(tsx, /<LogoWhatsApp size=\{24\} \/>/);
  assert.match(await ler("app/LogoWhatsApp.tsx"), /fill="#25D366"/);
  assert.doesNotMatch(tsx + css, /shop-vazio/, "os dois espaços vazios do desktop saíram");
  assert.match(css, /grid-template-areas: "marca busca whats acoes"/);
  assert.match(css, /grid-template-columns: auto minmax\(0, 1fr\) auto auto;/);
  // Só no desktop: no celular o botão fica escondido; perto de 992 px só o ícone.
  assert.match(css, /\.shop-whats \{ display: none; \}/);
  assert.match(css, /@media \(max-width: 1179px\) \{ \.shop-whats \{ width: 2\.75rem; padding: 0; \} \.shop-whats span \{ display: none; \} \}/);
});
