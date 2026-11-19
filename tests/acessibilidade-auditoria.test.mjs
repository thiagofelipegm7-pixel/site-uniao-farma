import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const M = await import("../app/shop/marcas.ts");
const ler = (a) => readFileSync(new URL(`../${a}`, import.meta.url), "utf8");

test("logos de marcas: a extensão certa vem primeiro (sem 404 em cadeia) e todo logo tem arquivo", () => {
  const todas = [...M.MARCAS_DESTAQUE, ...M.MARCAS_MEDICAMENTOS, ...M.MARCAS_DERMOCOSMETICOS, ...M.MARCAS_INFANTIL];
  for (const marca of todas) {
    const primeira = M.extensoesDoLogo(marca.slug)[0];
    const arquivo = new URL(`../public/marcas/${marca.slug}.${primeira}`, import.meta.url);
    // Marca sem arquivo nenhum mostra o nome em texto (permitido); com arquivo, a primeira tentativa tem de existir.
    const temAlgum = M.EXTENSOES_LOGO.some((e) => existsSync(new URL(`../public/marcas/${marca.slug}.${e}`, import.meta.url)));
    if (temAlgum) assert.ok(existsSync(arquivo), `${marca.slug}: o arquivo .${primeira} não existe (ajuste EXTENSAO_DO_LOGO em app/shop/marcas.ts)`);
  }
  assert.equal(M.extensoesDoLogo("wella")[0], "jpg");
  assert.equal(M.extensoesDoLogo("dove")[0], "png");
});

test("acessibilidade: nome acessível contém o texto visível (WCAG 2.5.3), campos com nome e sem aria-label em span", () => {
  const cabecalho = ler("app/shop/ShopHeader.tsx");
  assert.match(cabecalho, /aria-label="União Farma Drogaria e Perfumaria: página inicial"/);
  assert.match(cabecalho, /aria-label="Pedir no WhatsApp da loja Nações Unidas"/);
  assert.ok(!/União Farma, Drogaria e Perfumaria: página inicial/.test(ler("app/SiteFooter.tsx")), "sem vírgula no rótulo do logo");
  assert.ok(!/aria-label=\{`Ver \$\{nome\}`\}/.test(ler("app/nacoes-unidas/produtos/CartaoPanvel.tsx")), "o cartão usa o próprio texto como nome");
  const lista = ler("app/nacoes-unidas/produtos/ListaDrogasil.tsx");
  assert.match(lista, /<select aria-label="Itens por página"/);
  assert.match(lista, /<select aria-label="Ordenado por"/);
  const preco = ler("app/nacoes-unidas/produtos/Preco.tsx");
  assert.ok(!/<span className=\{classe\} aria-label/.test(preco), "aria-label não vale em span sem papel");
  assert.match(preco, /className="sr-only"/);
});

test("acessibilidade: botão Aceitar dos cookies tem contraste 4,5:1 com texto branco", () => {
  const css = ler("app/globals.css");
  const m = /\.cookie-accept \{ background: (#[0-9a-f]{6}); border-color: \1; \}/i.exec(css);
  assert.ok(m, "regra final do botão Aceitar");
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  assert.ok(1.05 / (lum(m[1]) + 0.05) >= 4.5, `contraste ${m[1]}`);
});

test("acessibilidade: botão Departamentos tem contraste 4,5:1 e o logo lê o mesmo texto do nome do link", () => {
  const css = ler("app/destaque-cesta.css");
  const m = /\.dm-slot--barra \.dm-menu \{ background: (#[0-9a-f]{6}) !important; \}/i.exec(css);
  assert.ok(m, "regra do botão Departamentos");
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  assert.ok(1.05 / (lum(m[1]) + 0.05) >= 4.5, `contraste ${m[1]}`);
  assert.match(ler("app/shop/MarcaUniao.tsx"), /União Farma<\/span>\{" "\}/, "espaço entre as duas linhas do logo (WCAG 2.5.3)");
});
