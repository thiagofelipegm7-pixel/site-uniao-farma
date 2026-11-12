import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("zoom e janela baixa: nada fixo come a tela (cabeçalho, barra de compra, colunas coladas) e o aviso de cookies fica compacto", async () => {
  const [css, layout] = await Promise.all([ler("app/zoom.css"), ler("app/layout.tsx")]);
  // Importado depois do design.css: as regras antigas também são !important e estão na camada "design".
  assert.ok(layout.indexOf('import "./zoom.css"') > layout.indexOf('import "./design.css"'));
  assert.match(css, /@layer design \{/);
  assert.match(css, /@media \(max-height: 620px\)/);
  for (const regra of [/\.cab-fixo \{ position: absolute !important/, /\.shop-header \{ position: static !important/, /\.pdp-compra[^{]*\{ position: static !important/, /\.produto-barra \{ display: none !important/, /section\.cookie-banner\.cookie-banner/]) assert.match(css, regra);
  // Janela bem baixa: o aviso entra no fluxo da página e o botão flutuante some.
  assert.match(css, /@media \(max-height: 420px\)[\s\S]*cookie-banner[\s\S]*position: relative !important/);
  // Setas dos carrosséis dentro da tela quando a janela é só um pouco maior que o conteúdo.
  assert.match(css, /@media \(max-width: 80rem\)[\s\S]*\.shop-seta-dir \{ right: 0\.25rem !important/);
});
