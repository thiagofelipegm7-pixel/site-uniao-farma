import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (a) => readFileSync(new URL(`../${a}`, import.meta.url), "utf8");

test("cesta: ao mudar de passo o foco vai para o título do passo novo (sem perder o lugar no teclado e no leitor de tela)", () => {
  const f = ler("app/reserva/ReservaFluxo.tsx");
  assert.match(f, /<h1 ref=\{tituloPasso\} tabIndex=\{-1\}>\{titulo\}<\/h1>/);
  assert.match(f, /tituloPasso\.current\?\.focus\(\);\r?\n  \}, \[passo\]\);/);
  assert.match(f, /primeiroPasso\.current = false;\r?\n      return;/, "o primeiro desenho não rouba o foco da página");
});

test("busca do cabeçalho: no painel de sugestões, Esc fecha e volta ao campo; setas andam entre as opções", () => {
  const h = ler("app/shop/ShopHeader.tsx");
  const painel = h.slice(h.indexOf('id="shop-sugestoes"'), h.indexOf("onClick={(event) => {", h.indexOf('id="shop-sugestoes"')));
  assert.match(painel, /event\.key === "Escape"/);
  assert.match(painel, /campo\?\.focus\(\);[^\n]*\n\s*setFoco\(false\);/, "primeiro o foco no campo, depois fechar (o foco reabre o painel)");
  assert.match(painel, /"ArrowDown"/);
  assert.match(painel, /"ArrowUp"/);
  assert.match(painel, /querySelectorAll<HTMLElement>\("a\[href\], button:not\(\[disabled\]\)"\)/);
});

test("cesta: botões de remover têm nomes diferentes e o erro de preenchimento leva o foco ao primeiro campo inválido", () => {
  const botao = ler("app/reserva/BotaoCesta.tsx");
  const sacola = ler("app/reserva/ReservaSacola.tsx");
  const fluxo = ler("app/reserva/ReservaFluxo.tsx");
  assert.match(botao, /Diminuir \$\{nome\} \(última unidade: sai da cesta\)/);
  assert.ok(!/`Remover \$\{nome\} da cesta`/.test(botao), "o contador não repete o nome da lixeira");
  assert.match(sacola, /aria-label=\{`Remover \$\{nomePedidoItem\(item\)\} da cesta`\}/);
  assert.match(fluxo, /aria-label=\{`Remover \$\{nomePedidoItem\(item\)\} da cesta`\}/);
  assert.match(fluxo, /function focarPrimeiroInvalido\(\)/);
  assert.equal((fluxo.match(/focarPrimeiroInvalido\(\);/g) ?? []).length, 2, "ao salvar o endereço e ao revisar o pedido");
  assert.match(fluxo, /main \[aria-invalid="true"\]/);
});
