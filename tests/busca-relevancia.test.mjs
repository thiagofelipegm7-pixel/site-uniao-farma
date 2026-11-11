import assert from "node:assert/strict";
import test from "node:test";
import { atalhosDaBusca, melhoresResultados, pontuarRelevancia } from "../app/shop/busca-painel.ts";
import { termosDeBusca } from "../app/nacoes-unidas/produtos/busca.ts";

const itens = [
  { nome: "Fita Fralda Cremer Azul", foto: "/a.webp" },
  { nome: "Cetoconazol 20MG/ML Shampoo 100ml Nativita", foto: "/b.webp" },
  { nome: "Fralda Babysec Mega G 32UND", foto: "/c.webp" },
  { nome: "Shampoo Camomila Skalinha bebê 200Ml", foto: "/d.webp" },
  { nome: "Fralda Pampers Supersec M 40UN", foto: null },
];
const busca = (consulta, n = 5) => {
  const termos = termosDeBusca(consulta);
  return melhoresResultados(itens, (i) => termos.every((t) => i.nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(t)), termos, (i) => i.nome, (i) => i.foto !== null, n).map((i) => i.nome);
};

test("relevância: nome que começa pela palavra buscada vem antes de acessório com a palavra no meio", () => {
  const r = busca("fralda");
  assert.equal(r[0], "Fralda Babysec Mega G 32UND");
  assert.ok(r.indexOf("Fralda Pampers Supersec M 40UN") < r.indexOf("Fita Fralda Cremer Azul"), "fralda sem foto ainda vence a fita");
  assert.equal(r.at(-1), "Fita Fralda Cremer Azul");
});

test("relevância: shampoo de uso comum antes do medicamentoso com a palavra no fim do nome", () => {
  const r = busca("shampoo");
  assert.equal(r[0], "Shampoo Camomila Skalinha bebê 200Ml");
});

test("relevância: foto desempata, o corte respeita n e a ordem original vale em empate total", () => {
  assert.ok(pontuarRelevancia("Fralda X", ["fralda"], true) > pontuarRelevancia("Fralda X", ["fralda"], false));
  assert.equal(busca("fralda", 2).length, 2);
  const iguais = [{ nome: "Fralda A" }, { nome: "Fralda B" }];
  assert.deepEqual(melhoresResultados(iguais, () => true, ["fralda"], (i) => i.nome, () => false, 2).map((i) => i.nome), ["Fralda A", "Fralda B"]);
});

test("atalhos: departamento e marca pelo começo do nome, só a partir de 3 letras, no máximo 1 + 2", () => {
  assert.deepEqual(atalhosDaBusca("be"), []);
  const bel = atalhosDaBusca("bel");
  assert.equal(bel[0].tipo, "departamento");
  assert.equal(bel[0].href, "/departamentos/beleza");
  const dove = atalhosDaBusca("dove");
  assert.deepEqual(dove.map((a) => [a.tipo, a.nome]), [["marca", "Dove"]]);
  assert.match(dove[0].href, /^\/nacoes-unidas\/produtos\?q=dove$/);
  assert.ok(atalhosDaBusca("ne").length === 0);
  const ne = atalhosDaBusca("neo");
  assert.ok(ne.length <= 3);
  assert.deepEqual(atalhosDaBusca("zzzz"), []);
});

test("destaque: marca o trecho digitado sem diferenciar acento ou maiúscula e sem alterar o texto", async () => {
  const { destacarTrechos } = await import("../app/shop/busca-painel.ts");
  const junto = (t) => t.map((x) => x.texto).join("");
  const nome = "Máscara Dove Hidratante Hialuron 500g";
  const t = destacarTrechos(nome, ["mascara"]);
  assert.deepEqual(t[0], { texto: "Máscara", destaque: true });
  assert.equal(junto(t), nome);
  assert.deepEqual(destacarTrechos("Fralda Isababy G 28UN", ["fralda"]), [{ texto: "Fralda", destaque: true }, { texto: " Isababy G 28UN", destaque: false }]);
  // começo de palavra vence ocorrência no meio ("endovenosa" tem "dove")
  const meio = destacarTrechos("Endovenosa Dove 5ml", ["dove"]);
  assert.deepEqual(meio.filter((x) => x.destaque).map((x) => x.texto), ["Dove"]);
  // vários termos, sem marcar o que não foi digitado
  const dois = destacarTrechos("Shampoo Dove Man Care 200ml", ["shampoo", "dove"]);
  assert.deepEqual(dois.filter((x) => x.destaque).map((x) => x.texto), ["Shampoo", "Dove"]);
  assert.equal(junto(dois), "Shampoo Dove Man Care 200ml");
  // sem ocorrência: um trecho só, sem destaque; termo de 1 letra é ignorado
  assert.deepEqual(destacarTrechos("Fita Cremer", ["xyz"]), [{ texto: "Fita Cremer", destaque: false }]);
  assert.deepEqual(destacarTrechos("Fita Cremer", ["f"]), [{ texto: "Fita Cremer", destaque: false }]);
  // fora da lista: acento composto e tamanho do texto preservados
  const cond = destacarTrechos("Condicionador Seda Cachos", ["condição"]);
  assert.equal(junto(cond), "Condicionador Seda Cachos");
});

test("buscas recentes: sobe repetida sem diferenciar acento, guarda no máximo 5, ignora termo curto e lixo", async () => {
  const { registrarBusca, removerBusca, lerBuscasRecentes, MAX_BUSCAS_RECENTES } = await import("../app/shop/buscas-recentes.ts");
  let l = [];
  for (const t of ["dove", "fralda", "shampoo", "dipirona", "protetor solar", "sabonete"]) l = registrarBusca(l, t);
  assert.equal(l.length, MAX_BUSCAS_RECENTES);
  assert.equal(l[0], "sabonete");
  assert.ok(!l.includes("dove"), "a mais antiga saiu");
  l = registrarBusca(l, "  FRALDA  ");
  assert.equal(l[0], "FRALDA");
  assert.equal(l.filter((x) => x.toLowerCase() === "fralda").length, 1, "sem repetir");
  assert.deepEqual(registrarBusca(["a b"], "x"), ["a b"], "1 letra não entra");
  assert.deepEqual(registrarBusca(["máscara"], "Mascara"), ["Mascara"], "acento não duplica");
  assert.deepEqual(removerBusca(["dove", "fralda"], "DOVE"), ["fralda"]);
  assert.deepEqual(lerBuscasRecentes(null), []);
  assert.deepEqual(lerBuscasRecentes("não é json"), []);
  assert.deepEqual(lerBuscasRecentes('{"a":1}'), []);
  assert.deepEqual(lerBuscasRecentes(JSON.stringify(["dove", 5, "x", "Dove", "fralda"])), ["dove", "fralda"]);
});

test("faixa de marcas por departamento: Perfumes não tem faixa; os demais têm lista própria ou usam a geral", async () => {
  const { MARCAS_POR_DEPARTAMENTO, MARCAS_DESTAQUE } = await import("../app/shop/marcas.ts");
  assert.deepEqual(MARCAS_POR_DEPARTAMENTO.perfumes, []);
  for (const slug of ["medicamentos", "dermocosmeticos", "infantil-e-gestante", "beleza"]) assert.ok(MARCAS_POR_DEPARTAMENTO[slug].length > 0, slug);
  assert.ok(MARCAS_POR_DEPARTAMENTO.beleza.length > 0, "Beleza tem lista própria");
  assert.equal(MARCAS_POR_DEPARTAMENTO["cuidado-diario"], undefined, "sem entrada: usa a faixa geral");
  assert.ok(MARCAS_DESTAQUE.length > 0);
});
