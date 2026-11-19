import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("passo Entrega da cesta: caminhão 3D com fundo transparente em círculo branco", async () => {
  const [icones, fluxo, css, png] = await Promise.all([ler("app/reserva/ReservaIcons.tsx"), ler("app/reserva/ReservaFluxo.tsx"), ler("app/shop/shop.css"), readFile(new URL("../public/icons/caminhao.png", import.meta.url))]);
  assert.match(icones, /export function IconCaminhaoArte/);
  assert.match(icones, /src="\/icons\/caminhao\.png"/);
  assert.match(fluxo, /i: <IconCaminhaoArte size=\{36\} \/>/);
  assert.doesNotMatch(fluxo, /i: <IconCaminhao size/);
  assert.match(css, /\.cesta-passos li span:has\(> img\) \{ background: #ffffff;/);
  // PNG de verdade (assinatura), com canal alfa (tipo de cor 6 = RGBA) e peso razoável para o celular.
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png[25], 6, "o PNG tem transparência");
  assert.ok(png.length < 200 * 1024, `caminhao.png tem ${png.length} bytes`);
  // Dimensões da arte: a proporção do componente (466 x 330) tem que bater com o arquivo.
  assert.equal(png.readUInt32BE(16), 466);
  assert.equal(png.readUInt32BE(20), 330);
});
