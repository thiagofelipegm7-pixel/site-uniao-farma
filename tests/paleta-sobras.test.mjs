import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("paleta: texto e links em preto puro, sem estilo embutido fora da paleta no layout", async () => {
  const [a11y, layout, base, salvar] = await Promise.all([
    ler("app/a11y.css"),
    ler("app/layout.tsx"),
    ler("app/base-direcao.css"),
    ler("app/shop/SalvarNaLista.tsx"),
  ]);
  assert.doesNotMatch(a11y, /#0a1f1c|#00241f/i); // quase-preto esverdeado virou #000000 (21:1, A-01)
  assert.doesNotMatch(layout, /#001a17|#f0faf8|#042c29/i);
  assert.doesNotMatch(layout, /<style>\{`/);
  assert.match(base, /\.shop-busca-orbita \{\s*display: none !important;/); // traço animado sem pausa (A-11)
  assert.match(base, /:is\(\.depto-painel, \.dm-menu\) :is\(\*/); // menu Departamentos com texto legível
  assert.doesNotMatch(salvar, /style=\{\{/); // sem cor embutida; alvo de 48 px vem da classe (A-10)
  assert.match(salvar, /aria-expanded=\{aberto\}/);
  assert.match(salvar, /role="status"/);
  assert.match(base, /\.salvar-lista-botao,[\s\S]*?min-height: 48px !important;/);
});

test("paleta: páginas de bairro, legais, novidades e ofertas sem verde nem contorno", async () => {
  const base = await ler("app/base-direcao.css");
  assert.match(base, /:is\(\.direct-unit-link, \.landing-unit-card, \.landing-benefit-grid li, \.unit-faq-item[^)]*\) \{\s*border-color: transparent !important;/);
  assert.match(base, /\.direct-unit-link \.direct-unit-actions a\[aria-label\*="WhatsApp"\],[\s\S]*?background: #000000 !important;/);
  assert.match(base, /\.offers-page :is\(a\.offer-consult-choose, a\.button, \.offer-alerts-button\)[\s\S]*?background: #000000 !important;/);
  assert.match(base, /\.unit-page \.section-inner > select[\s\S]*?border-color: #000000 !important;/); // campo mantém contorno 3:1 (A-02)
});
