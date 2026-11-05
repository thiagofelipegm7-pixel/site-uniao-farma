import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const lerJson = async (arquivo) => JSON.parse(await readFile(new URL(`../${arquivo}`, import.meta.url), "utf8"));
const tolerante = () => import("../app/nacoes-unidas/produtos/busca-tolerante.ts");
const nucleo = () => import("../app/busca-ia-nucleo.ts");
const busca = () => import("../app/nacoes-unidas/produtos/busca.ts");

async function vocabulario(incluirReceita) {
  const { criarVocabulario } = await tolerante();
  const otc = (await lerJson("public/dados/nacoes/catalogo-busca.json")).map((i) => i.busca);
  const rx = incluirReceita ? (await lerJson("public/dados/nacoes/restritos-busca.json")).map((i) => i.busca) : [];
  return criarVocabulario([...otc, ...rx]);
}

test("erros comuns de digitação: a correção local acha o produto certo no catálogo", async () => {
  const { analisarConsulta, contarCasos, candidatosParaIA } = await tolerante();
  const vocab = await vocabulario(true);
  const casos = await lerJson("tests/busca-tolerante-casos.json");
  const soIA = new Set(["rekzona", "amoxilina"]);
  // "pampes" já acha Pampers pela busca normal (o plural "es" é cortado), então não precisa de correção.
  const semProduto = new Set(["pampes"]);
  for (const caso of casos) {
    const analise = analisarConsulta(vocab, caso.digitado);
    if (semProduto.has(caso.digitado)) {
      assert.equal(analise.corrigida, null, `${caso.digitado}: a busca normal já resolve`);
      continue;
    }
    if (soIA.has(caso.digitado)) {
      // Dúvida: vai para a IA, que só escolhe entre estas palavras reais do catálogo.
      assert.equal(analise.corrigida, null, `${caso.digitado}: deveria ir para a IA`);
      assert.ok(candidatosParaIA(vocab, analise.desconhecidas).includes(caso.esperado), `${caso.digitado}: candidatos sem ${caso.esperado}`);
      continue;
    }
    assert.ok(analise.corrigida, `${caso.digitado}: sem correção`);
    assert.ok(analise.corrigida.includes(caso.esperado), `${caso.digitado} -> ${analise.corrigida} (esperado ${caso.esperado})`);
    assert.ok(contarCasos(vocab, analise.corrigida) > 0, `${caso.digitado}: correção sem produtos`);
  }
});

test("palavras sem relação com o catálogo não viram produto por engano", async () => {
  const { analisarConsulta } = await tolerante();
  const vocab = await vocabulario(true);
  for (const texto of ["camomilina", "hipopo", "pressat", "xyzqwk", "carro de corrida"]) {
    assert.equal(analisarConsulta(vocab, texto).corrigida, null, texto);
  }
});

test("pedido por sintoma não indica remédio: só orienta falar com o farmacêutico", async () => {
  const { analisarConsulta, pareceSintoma } = await tolerante();
  const vocab = await vocabulario(true);
  for (const texto of ["remedio pra dor de cabessa", "remédio de pressão", "o que tomar para febre", "dor de garganta"]) {
    assert.ok(pareceSintoma(texto), texto);
    assert.equal(analisarConsulta(vocab, texto).sintoma, true, texto);
  }
  for (const texto of ["dipirona", "fralda", "dorflex"]) assert.equal(pareceSintoma(texto), false, texto);
});

test("sinônimos populares viram o nome que o catálogo usa", async () => {
  const { aplicarSinonimos } = await tolerante();
  assert.match(aplicarSinonimos("xampu"), /shampoo/);
});

test("IA: resposta é limpa, só passa palavra candidata e sintoma nunca devolve termo", async () => {
  const { limparRespostaIA, consultaValida, candidatosValidos, conteudoDaRespostaIA } = await nucleo();
  const candidatos = ["dipirona", "dorflex"];
  assert.deepEqual(limparRespostaIA({ termos: ["Dipirona", "aspirina", "dipirona"], sintoma: false }, candidatos), { termos: ["dipirona"], sintoma: false });
  assert.deepEqual(limparRespostaIA('texto {"termos":["dorflex"],"sintoma":false} fim', candidatos), { termos: ["dorflex"], sintoma: false });
  assert.deepEqual(limparRespostaIA({ termos: ["dipirona"], sintoma: true }, candidatos), { termos: [], sintoma: true });
  assert.equal(limparRespostaIA("sem json", candidatos), null);
  assert.equal(limparRespostaIA({ termos: "dipirona" }, candidatos), null);
  assert.deepEqual(limparRespostaIA({ termos: ["dipirona"] }, []), { termos: [], sintoma: false });
  assert.equal(consultaValida("  Diprona!! "), "diprona");
  assert.equal(consultaValida("ab"), "");
  assert.equal(consultaValida("x".repeat(80)), "");
  assert.deepEqual(candidatosValidos("dipirona,Dipirona,<script>,ab,dorflex"), ["dipirona", "dorflex"]);
  assert.deepEqual(conteudoDaRespostaIA({ response: { termos: [] } }), { termos: [] });
  assert.equal(conteudoDaRespostaIA({ choices: [{ message: { content: "oi" } }] }), "oi");
});

test("limitador: bloqueia acima do máximo e libera depois da janela", async () => {
  const { criarLimitador } = await nucleo();
  let agora = 0;
  const permitir = criarLimitador(2, 1000, () => agora);
  assert.equal(permitir("a"), true);
  assert.equal(permitir("a"), true);
  assert.equal(permitir("a"), false);
  assert.equal(permitir("b"), true);
  agora = 1500;
  assert.equal(permitir("a"), true);
});

test("busca com alternativas: OU entre consultas, E dentro de cada uma", async () => {
  const { filtrarGruposAlternativos, aplicarCatalogo } = await busca();
  const grupos = [
    { categoria: "Medicamentos", itens: [{ nome: "Dipirona 500mg", lab: "EMS", preco: 5 }, { nome: "Dorflex 36", lab: "Sanofi", preco: 9 }] },
    { categoria: "Higiene", itens: [{ nome: "Fralda G", lab: "Pampers", preco: 30 }] },
  ];
  const lista = filtrarGruposAlternativos(grupos, ["dipirona", "fralda"]);
  assert.equal(lista.reduce((n, g) => n + g.itens.length, 0), 2);
  assert.equal(filtrarGruposAlternativos(grupos, ["dipirona sanofi"]).length, 0);
  assert.equal(aplicarCatalogo(grupos, { consulta: "diprona", consultasAlternativas: ["dipirona"] }).reduce((n, g) => n + g.itens.length, 0), 1);
  assert.equal(aplicarCatalogo(grupos, { consulta: "diprona" }).length, 0);
});
