import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const V = await import("../app/vistos-recentemente.ts");
const E = await import("../app/reserva/entrega-escolhida.ts");
const A = await import("../app/area-entrega.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("visto recentemente: o mais novo vai para a frente, sem repetir, no máximo 10, e texto estranho vira lista vazia", () => {
  assert.deepEqual(V.adicionarVisto(["a", "b", "c"], "b"), ["b", "a", "c"]);
  assert.equal(V.adicionarVisto(Array.from({ length: 10 }, (_, i) => `p${i}`), "novo").length, 10);
  assert.equal(V.adicionarVisto(["a"], "Slug Inválido!")[0], "a", "slug fora do padrão não entra");
  assert.deepEqual(V.lerVistos('["a","b","a","<script>",3]'), ["a", "b"]);
  assert.deepEqual(V.lerVistos("lixo"), []);
  assert.deepEqual(V.lerVistos(null), []);
});

test("entrega escolhida: só vale bairro que a loja atende; o CEP digitado resolve para bairros e taxas oficiais", () => {
  assert.equal(E.lerEntregaEscolhida('{"bairro":"Coqueiros"}'), "Coqueiros");
  assert.equal(E.lerEntregaEscolhida('{"bairro":"Savassi"}'), null);
  assert.equal(E.lerEntregaEscolhida('{"bairro":"<img>"}'), null);
  assert.equal(E.lerEntregaEscolhida(null), null);
  // CEP da própria loja: atendido, taxa de R$ 1,00
  const loja = A.consultarCep("34590-010");
  assert.equal(loja.status, "atendida");
  assert.equal(loja.taxaCentavos, 100);
  assert.equal(A.consultarCep("01310-100").status, "fora");
  assert.equal(A.consultarCep("34590").status, "incompleto");
});

test("home: a faixa promete só o que a loja confirma (sem prazo, sem frete grátis), com entrega por CEP/bairro e acesso por teclado", async () => {
  const [blocos, entregar, home, rota, produto, fluxo] = await Promise.all([
    ler("app/shop/HomeBlocos.tsx"), ler("app/shop/EntregarEm.tsx"), ler("app/HomePage.tsx"), ler("app/api/destaques/route.ts"),
    ler("app/nacoes-unidas/produtos/[slug]/page.tsx"), ler("app/reserva/ReservaFluxo.tsx"),
  ]);
  const faixa = blocos.slice(blocos.indexOf("export function FaixaInfo"), blocos.indexOf("/** Cartões de benefícios"));
  assert.match(faixa, /<EntregarEm \/>/);
  assert.match(faixa, /Trocas e devoluções/);
  assert.match(faixa, /tabIndex=\{rola \? 0 : undefined\}/, "faixa que rola no celular é alcançável pelo teclado");
  assert.ok(!/frete gr[aá]tis|em at[eé] \d+ ?(min|hora)|mesmo dia|chega em/i.test(faixa + entregar), "sem promessa de prazo nem frete grátis");
  assert.match(entregar, /Taxa e prazo são confirmados pelo WhatsApp/);
  assert.match(entregar, /O CEP não é guardado/);
  assert.ok(!/localStorage|guardarEntregaEscolhida\(cep|setItem\([^)]*cep/i.test(entregar.replace(/guardarEntregaEscolhida\(b\)/g, "")), "o CEP não vai para o armazenamento");
  assert.match(home, /<CestaRetomada \/>/);
  assert.match(home, /<VistoRecentemente \/>/);
  assert.match(fluxo, /carregarEntregaEscolhida\(\)/);
  // Remédio nunca entra no "Visto recentemente": nem na gravação, nem na resposta da API
  assert.match(produto, /\{precoFirme \? <RegistrarVisto slug=\{slugItem\} \/> : null\}/);
  assert.match(rota, /item\.isMIP \|\| item\.categoria === "Medicamentos"/);
  assert.match(rota, /"cache-control": "no-store"/);
});
