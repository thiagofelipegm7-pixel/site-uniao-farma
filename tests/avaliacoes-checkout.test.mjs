import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dados = await import("../app/data/avaliacoes-google.ts");
const perfis = await import("../app/google-reviews.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

const PROIBIDO = /\b(medicamento|rem[eé]dio|receita|cura|indica[cç][aã]o|indica[r ]|efeito|milagre|tratamento)\b/i;

test("cesta e checkout usam avaliações reais do Google, sem inventar texto", () => {
  const lista = dados.AVALIACOES_CESTA;
  assert.ok(lista.length >= 3 && lista.length <= 6, "guarde de 3 a 6 avaliações");
  const lojas = new Set(lista.map((a) => a.unitId));
  assert.deepEqual(lojas, new Set(["fatima", "nacoes", "itacolomi"]));
  for (const a of lista) {
    assert.equal(a.estrelas, 5);
    assert.equal(a.fonte, "avaliação no Google");
    assert.equal(a.coletadaEm, "2026-11-25");
    assert.match(a.nomeExibicao, /^.+ [A-ZÁÉÍÓÚÂÊÔÃÕÇ]\.$/u);
    assert.ok(a.texto.trim().length > 0);
    assert.doesNotMatch(a.texto, PROIBIDO);
    assert.ok(a.urlAvaliacoes.startsWith("https://search.google.com/local/reviews?placeid="));
  }
  const textos = lista.map((a) => a.texto);
  assert.ok(textos.includes("Atendimento excelente, todos são muito gentis as entregas chegam rapidamente"));
  assert.ok(textos.includes("Excelente farmácia, ótimos preços e excelente atendimento."));
  assert.ok(textos.includes("Excelente atendimento, preços e promoções. Recomendo."));
  assert.ok(textos.includes("Preço bom e entrega rápida e sem contar com o ótimo atendimento."));
  assert.ok(textos.includes("Excelente atendimento 🥰"));
  assert.ok(textos.includes("Atendimento perfeito"));
});

test("notas do Google são as oficiais de cada loja, sem média inventada", () => {
  const porLoja = Object.fromEntries(dados.NOTAS_GOOGLE_LOJAS.map((n) => [n.unitId, n]));
  assert.equal(porLoja.fatima.nota, 4.6);
  assert.equal(porLoja.fatima.quantidade, 20);
  assert.equal(porLoja.nacoes.nota, 4.8);
  assert.equal(porLoja.nacoes.quantidade, 31);
  assert.equal(porLoja.itacolomi.nota, 4.6);
  assert.equal(porLoja.itacolomi.quantidade, 12);
  const texto = dados.textoNotasGoogle();
  assert.match(texto, /Google/);
  assert.match(texto, /Fátima 4,6 \(20\)/);
  assert.match(texto, /Nações Unidas 4,8 \(31\)/);
  assert.match(texto, /Itacolomi 4,6 \(12\)/);
  assert.doesNotMatch(texto, /4,7/); // não inventar média única das três lojas
  for (const perfil of perfis.UNIT_GOOGLE_PROFILES) {
    const nota = porLoja[perfil.unitId];
    assert.equal(perfil.rating, nota.nota);
    assert.equal(perfil.reviewCount, nota.quantidade);
  }
});

test("o bloco aparece abaixo do total na gaveta, na cesta e no finalizar", async () => {
  const [gaveta, fluxo, componente] = await Promise.all([
    ler("app/reserva/ReservaSacola.tsx"),
    ler("app/reserva/ReservaFluxo.tsx"),
    ler("app/reserva/AvaliacoesCesta.tsx"),
  ]);
  assert.match(componente, /from "\.\.\/data\/avaliacoes-google"/);
  assert.match(gaveta, /<AvaliacoesCesta variante="gaveta" \/>/);
  assert.ok(gaveta.indexOf("cm-subtotal") < gaveta.indexOf('<AvaliacoesCesta variante="gaveta"'));
  assert.match(fluxo, /<AvaliacoesCesta variante="resumo" \/>/);
  assert.equal([...fluxo.matchAll(/<AvaliacoesCesta variante="resumo" \/>/g)].length, 2);
  const p1 = fluxo.indexOf('onClick={() => ir(2)}>Continuar: entrega ou retirada');
  const p3 = fluxo.indexOf('{enviarWhats("fluxo-botao fluxo-botao-resumo")}');
  const p2 = fluxo.indexOf("Revisar pedido");
  const a1 = fluxo.indexOf('<AvaliacoesCesta variante="resumo" />');
  const a2 = fluxo.indexOf('<AvaliacoesCesta variante="resumo" />', a1 + 1);
  assert.ok(a1 > 0 && a1 < p1, "bloco na cesta, perto de continuar");
  assert.ok(a2 > 0 && a2 < p3, "bloco no finalizar, perto de enviar");
  assert.ok(p2 > 0 && (fluxo.slice(p2 - 200, p2).includes("AvaliacoesCesta") === false), "passo 2 não precisa do bloco");
});
