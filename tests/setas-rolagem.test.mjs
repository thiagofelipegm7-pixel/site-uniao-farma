import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { podeRolar } from "../app/shop/rolagem.ts";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("podeRolar: esquerda desabilitada no começo, direita no fim, as duas ativas no meio", () => {
  assert.deepEqual(podeRolar({ scrollLeft: 0, scrollWidth: 1200, clientWidth: 400 }), { esquerda: false, direita: true });
  assert.deepEqual(podeRolar({ scrollLeft: 400, scrollWidth: 1200, clientWidth: 400 }), { esquerda: true, direita: true });
  assert.deepEqual(podeRolar({ scrollLeft: 800, scrollWidth: 1200, clientWidth: 400 }), { esquerda: true, direita: false });
  assert.deepEqual(podeRolar({ scrollLeft: 0, scrollWidth: 400, clientWidth: 400 }), { esquerda: false, direita: false });
});

test("setas de rolagem: círculos no cabeçalho, seta com haste, estado ligado ao scroll, ocultas no celular", async () => {
  const [componente, destaques, marcas, css] = await Promise.all([
    ler("app/shop/SetasRolagem.tsx"),
    ler("app/shop/DestaquesSemana.tsx"),
    ler("app/shop/MarcasLinha.tsx"),
    ler("app/shop/shop.css"),
  ]);

  assert.match(componente, /strokeWidth="1\.6"/);
  assert.match(componente, /strokeLinecap="round"/);
  assert.match(componente, /d="M19 12H5M11 6l-6 6 6 6"/);
  assert.match(componente, /d="M5 12h14M13 6l6 6-6 6"/);
  assert.match(componente, /disabled=\{!esquerda\}/);
  assert.match(componente, /disabled=\{!direita\}/);
  assert.match(componente, /scrollBy/);
  assert.match(componente, /prefers-reduced-motion/);

  assert.match(destaques, /shop-destaques-topo/);
  assert.match(destaques, /shop-destaques-acoes/);
  assert.match(destaques, /<SetasRolagem alvo=\{lista\} rotulo=\{titulo\} \/>/);
  assert.doesNotMatch(destaques, /shop-seta shop-seta-esq/);
  assert.doesNotMatch(marcas, /shop-marcas-seta/);
  assert.match(marcas, /shop-marcas-topo/);
  assert.match(marcas, /<SetasRolagem alvo=\{trilho\} rotulo="Navegue por marcas" \/>/);

  assert.match(css, /\.shop-setas \{ display: none;/);
  assert.match(css, /@media \(min-width: 992px\)[\s\S]*\.shop-setas \{ display: flex; \}/);
  assert.match(css, /\.shop-seta \{[\s\S]*width: 2\.5rem;[\s\S]*height: 2\.5rem;[\s\S]*border: 1px solid #94a3b8;[\s\S]*border-radius: 50%;[\s\S]*background: #ffffff;[\s\S]*color: #0a3548;/);
  assert.match(css, /\.shop-seta:hover:not\(:disabled\) \{ background: #f8fafc; border-color: #0a3548; \}/);
  assert.match(css, /\.shop-seta:disabled \{ border-color: #e2e8f0; color: #cbd5e1; cursor: default; \}/);
  assert.doesNotMatch(css, /\.shop-seta-esq \{ left:/);
  assert.doesNotMatch(css, /\.shop-seta \{ position: absolute/);
});
