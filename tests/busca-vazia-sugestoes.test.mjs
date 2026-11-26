import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const S = await import("../app/nacoes-unidas/produtos/busca-vazia-sugestoes.ts");
const { elegivelParaPares } = await import("../app/nacoes-unidas/produtos/relacionados.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

const shampoo = { nome: "Shampoo Seda 325ml", lab: "Seda", categoria: "Cuidado Diário", preco: 12, isMIP: false, slug: "shampoo-seda-325ml", precoFmt: "R$ 12,00", foto: null };
const sabonete = { nome: "Sabonete Dove 90g", lab: "Dove", categoria: "Cuidado Diário", preco: 8, isMIP: false, slug: "sabonete-dove-90g", precoFmt: "R$ 8,00", foto: null };
const perfume = { nome: "Perfume Kaiak 100ml", lab: "Natura", categoria: "Perfumes", preco: 90, isMIP: false, slug: "perfume-kaiak-100ml", precoFmt: "R$ 90,00", foto: null };
const hidratante = { nome: "Hidratante Nivea 200ml", lab: "Nivea", categoria: "Cuidado Diário", preco: 20, isMIP: false, slug: "hidratante-nivea-200ml", precoFmt: "R$ 20,00", foto: null };
const desodorante = { nome: "Desodorante Rexona 150ml", lab: "Rexona", categoria: "Cuidado Diário", preco: 15, isMIP: false, slug: "desodorante-rexona-150ml", precoFmt: "R$ 15,00", foto: null };
const dipirona = { nome: "Dipirona 500mg 10 comprimidos", lab: "Medley", categoria: "Medicamentos", preco: 10, isMIP: true, slug: "dipirona-500mg", precoFmt: "R$ 10,00", foto: null };
const seringa = { nome: "Seringa 5ml", lab: "BD", categoria: "Cuidado Diário", preco: 3, isMIP: false, slug: "seringa-5ml", precoFmt: "R$ 3,00", foto: null };

const grupos = [
  { categoria: "Cuidado Diário", id: "cuidado", itens: [shampoo, sabonete, hidratante, desodorante, seringa] },
  { categoria: "Perfumes", id: "perfumes", itens: [perfume] },
  { categoria: "Medicamentos", id: "med", itens: [dipirona] },
];

test("busca vazia: bloqueia sintoma, remédio, dose e o filtro de saúde do Combina com", () => {
  for (const ruim of [
    "dor de cabeça",
    "o que tomar pra febre",
    "estou com dor",
    "remedio pra dor",
    "dipirona 500mg",
    "amoxicilina 875mg",
    "xarope para tosse",
    "acne",
    "alcool 70",
    "seringa",
    "teste de gravidez",
    "vitamina c 1g",
  ]) {
    assert.equal(S.consultaBloqueiaSugestao(ruim), true, ruim);
    assert.deepEqual(S.sugestoesParaBuscaVazia(ruim, S.itensElegiveisParaBuscaVazia(grupos), S.termosDeRemedioDoCatalogo(grupos)), [], ruim);
  }
});

test("busca vazia: casa com medicamento do catálogo mesmo sem achar o produto", () => {
  const termos = S.termosDeRemedioDoCatalogo(grupos);
  assert.equal(S.consultaCasaComRemedio("dipirona 999", termos), true);
  assert.equal(S.consultaCasaComRemedio("shampoo lunar", termos), false);
  assert.deepEqual(S.sugestoesParaBuscaVazia("dipirona xyz", S.itensElegiveisParaBuscaVazia(grupos), termos), []);
});

test("busca vazia: devolve 3 a 6 itens elegíveis e prefere quem casa com as palavras", () => {
  const elegiveis = S.itensElegiveisParaBuscaVazia(grupos);
  assert.ok(elegiveis.every((i) => elegivelParaPares(i) && !i.isMIP));
  assert.ok(!elegiveis.some((i) => /seringa|dipirona/i.test(i.nome)));
  const achados = S.sugestoesParaBuscaVazia("shampoo lunar azul", elegiveis, S.termosDeRemedioDoCatalogo(grupos));
  assert.ok(achados.length >= 3 && achados.length <= 6);
  assert.equal(achados[0].slug, "shampoo-seda-325ml");
  assert.ok(achados.every((i) => elegivelParaPares(i)));
});

test("busca vazia: sem casamento ainda mostra uma fatia estável; menos de 3 some", () => {
  const elegiveis = S.itensElegiveisParaBuscaVazia(grupos);
  const fallback = S.sugestoesParaBuscaVazia("xyzabcnaoexiste", elegiveis, []);
  assert.ok(fallback.length >= 3 && fallback.length <= 6);
  const deNovo = S.sugestoesParaBuscaVazia("xyzabcnaoexiste", elegiveis, []);
  assert.deepEqual(fallback.map((i) => i.slug), deNovo.map((i) => i.slug));
  assert.deepEqual(S.sugestoesParaBuscaVazia("shampoo", [shampoo, sabonete], []), []);
});

test("busca vazia: a tela mantém o WhatsApp, some no sintoma e não consulta o D1", async () => {
  const [lista, modulo] = await Promise.all([
    ler("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    ler("app/nacoes-unidas/produtos/busca-vazia-sugestoes.ts"),
  ]);
  assert.match(lista, /href=\{whatsappBusca\}/);
  assert.match(lista, /produtos_nacoes_busca_vazia/);
  assert.match(lista, /tolerante\.tipo === "sintoma"/);
  assert.match(lista, /sugestoesParaBuscaVazia/);
  assert.match(lista, /Outras opções da loja/);
  assert.match(lista, /if \(!buscando \|\| esperando \|\| total > 0 \|\| tolerante\.tipo === "sintoma"\) return \[\]/);
  assert.doesNotMatch(modulo, /D1Database|prepare\(|exec\(/);
  assert.doesNotMatch(lista, /api\/.*d1|prepare\(/i);
});
