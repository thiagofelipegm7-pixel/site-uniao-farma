import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("C-08/C-16: notas reais do Google na home e ao lado do botão de comprar, da fonte única", async () => {
  const [notas, home, produto] = await Promise.all([ler("app/shop/NotasGoogle.tsx"), ler("app/HomePage.tsx"), ler("app/nacoes-unidas/produtos/[slug]/page.tsx")]);
  assert.match(notas, /NOTAS_GOOGLE_LOJAS/); // L-1: nada digitado à mão aqui
  assert.match(notas, /urlAvaliacoes/); // dá para conferir no Google
  assert.match(home, /<NotasGoogle className="notas-google--home" \/>/);
  assert.match(produto, /<RespostasCompra \/>/);
});

test("P-15/R-06: página de medicamento não mostra avaliação", async () => {
  const produto = await ler("app/nacoes-unidas/produtos/[slug]/page.tsx");
  assert.match(produto, /ehMedicamentoOuDuvida\(item\) \? null : <NotasGoogle \/>/);
});

test("C-13/C-14: respostas perto do botão e aviso do que acontece depois, sem prazo inventado", async () => {
  const [respostas, pos, fluxo] = await Promise.all([ler("app/shop/RespostasCompra.tsx"), ler("app/reserva/PosCliqueWhats.tsx"), ler("app/reserva/ReservaFluxo.tsx")]);
  assert.match(respostas, /LinhasConfianca/);
  assert.match(respostas, /não cobra nada/);
  assert.match(pos, /não paga nada/);
  assert.doesNotMatch(pos, /\d+\s*(min|minuto|hora)/i); // L-1: prazo só quando a loja definir (P-20)
  assert.equal((fluxo.match(/<PosCliqueWhats \/>/g) || []).length, 1); // só no resumo; a barra fixa do celular não cresce
});
