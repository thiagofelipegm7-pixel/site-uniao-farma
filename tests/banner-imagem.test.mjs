import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { idDaLinhaValido, lerImagemDeDataUrl, urlDaImagemDoBanner } from "../app/banner-imagem.ts";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
// 1×1 pixel GIF transparente (imagem real e minúscula).
const GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

test("o endereço da arte usa o id da linha (cada arte nova muda o endereço)", () => {
  assert.equal(urlDaImagemDoBanner(123), "/api/banner-imagem?v=123");
  assert.equal(urlDaImagemDoBanner(7.9), "/api/banner-imagem?v=7");
});

test("só aceita id numérico positivo e razoável", () => {
  assert.equal(idDaLinhaValido("42"), 42);
  for (const ruim of [null, "", "0", "-3", "4.5", "abc", "1e3", "12345678901234", "1 OR 1=1", "../x"]) assert.equal(idDaLinhaValido(ruim), null, String(ruim));
});

test("lê imagem em data URL base64 (webp, jpeg, png, gif, avif) e devolve os bytes", () => {
  const lida = lerImagemDeDataUrl(`data:image/gif;base64,${GIF}`);
  assert.ok(lida);
  assert.equal(lida.tipo, "image/gif");
  assert.equal(String.fromCharCode(...lida.bytes.slice(0, 3)), "GIF");
  for (const tipo of ["webp", "jpeg", "png", "avif"]) assert.ok(lerImagemDeDataUrl(`data:image/${tipo};base64,${GIF}`), tipo);
});

test("recusa SVG, outros tipos, texto sem base64 e dado vazio ou inválido", () => {
  assert.equal(lerImagemDeDataUrl(`data:image/svg+xml;base64,${GIF}`), null); // SVG pode carregar script
  assert.equal(lerImagemDeDataUrl(`data:text/html;base64,${GIF}`), null);
  assert.equal(lerImagemDeDataUrl("data:image/png,abc"), null);
  assert.equal(lerImagemDeDataUrl("data:image/png;base64,"), null);
  assert.equal(lerImagemDeDataUrl("data:image/png;base64,@@@"), null);
  assert.equal(lerImagemDeDataUrl("/banners/arquivo.jpg"), null);
  assert.equal(lerImagemDeDataUrl(null), null);
  assert.equal(lerImagemDeDataUrl(undefined), null);
});

test("a rota entrega o arquivo com cache de um ano e responde 404 para o que não é banner", async () => {
  const rota = await ler("app/api/banner-imagem/route.ts");
  assert.match(rota, /max-age=31536000, immutable/);
  assert.match(rota, /stage = \?/); // só linhas de banner
  assert.match(rota, /idDaLinhaValido/);
  assert.match(rota, /status: 404/);
  assert.match(rota, /x-content-type-options": "nosniff"/);
});

test("a lista pública de banners não leva mais a arte em base64: aponta para o arquivo", async () => {
  const servidor = await ler("app/shop/destaques-servidor.ts");
  assert.match(servidor, /substr\(source, 1, 5\) = 'data:'/);
  assert.match(servidor, /urlDaImagemDoBanner\(b\.linha\)/);
  assert.match(servidor, /export function bannersLeves/);
  assert.match(servidor, /export async function bannersDoServidor/);
});
