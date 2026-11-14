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

test("nome parecido com OUTRO produto não é trocado sozinho: o site pergunta", async () => {
  const { analisarConsulta, ehErroDeDigitacao } = await tolerante();
  const vocab = await vocabulario(true);
  // Erros claros de digitação continuam corrigidos sem perguntar.
  assert.ok(ehErroDeDigitacao("diprona", "dipirona"));
  assert.ok(ehErroDeDigitacao("dipriona", "dipirona"));
  assert.ok(ehErroDeDigitacao("losartna", "losartana"));
  // Produtos diferentes que só se parecem.
  for (const [digitado, outro] of [["prednisolona", "prednisona"], ["cereja", "cerveja"], ["acido", "amido"], ["verde", "verme"]]) {
    assert.equal(ehErroDeDigitacao(digitado, outro), false, `${digitado} x ${outro}`);
  }
  const semProduto = new Set(["prednisolona"]);
  for (const palavra of semProduto) {
    const sem = { ...vocab, palavras: vocab.palavras.filter((p) => p.w !== palavra), porPalavra: new Map(vocab.palavras.filter((p) => p.w !== palavra).map((p) => [p.w, p])), corpus: vocab.corpus.split(palavra).join("#") , textos: vocab.textos.map((t) => t.split(palavra).join("#")) };
    const analise = analisarConsulta(sem, palavra);
    assert.equal(analise.corrigida, null, `${palavra}: não pode trocar sozinho`);
    assert.ok(analise.sugerida?.includes("prednisona"), `${palavra}: deveria sugerir prednisona (${analise.sugerida})`);
  }
});

test("IA: 'pílula do dia seguinte' acha o produto (levonorgestrel) em vez de virar 'pilha'; troca duvidosa vira pergunta", async () => {
  const { analisarConsulta, interpretarCorrecaoIA, pareceSintoma, contarCasos } = await tolerante();
  const vocab = await vocabulario(true);
  // Pílula não é mais pedido de orientação: a busca mostra o que existe.
  for (const t of ["pilula do dia seguinte", "pílula", "postinor"]) assert.equal(pareceSintoma(t), false, t);
  const a = analisarConsulta(vocab, "pilula do dia seguinte");
  assert.equal(a.corrigida, null, "sem troca automática por palavra parecida");
  // Mesmo que a IA proponha "pilha", a busca com as outras palavras não acharia nada: descarta.
  assert.equal(interpretarCorrecaoIA(vocab, { tokens: ["pilula", "dia", "seguinte"], desconhecidas: ["pilula", "seguinte"] }, ["pilha"]), null);
  // Palavra solta duvidosa vira pergunta, não troca automática.
  const r = interpretarCorrecaoIA(vocab, analisarConsulta(vocab, "pilula"), ["pilha"]);
  assert.ok(r === null || r.tipo === "sugestao", JSON.stringify(r));
  // Termo da IA que não se parece com nada digitado é invenção: ignorado.
  assert.equal(interpretarCorrecaoIA(vocab, analisarConsulta(vocab, "xyzqwk"), ["shampoo"]), null);
});

test("pílula do dia seguinte abre os produtos de contracepção de emergência da loja", async () => {
  const S = await import("../app/nacoes-unidas/produtos/sintomas-otc.ts");
  const { contarCasos } = await tolerante();
  const vocab = await vocabulario(true);
  const s = S.sintomaConhecido("pílula do dia seguinte");
  assert.equal(s.comReceita, true);
  assert.ok(s.termos.filter((t) => contarCasos(vocab, t) > 0).length >= 2);
  assert.equal(S.sintomaConhecido("pilula").rotulo, "pílula");
  assert.equal(S.sintomaConhecido("anticoncepcional").rotulo, "pílula");
  assert.equal(S.sintomaConhecido("pilula do dia seguinte").rotulo, "pílula do dia seguinte");
});

test("sintoma conhecido abre medicamentos sem receita da lista fixa que a loja tem", async () => {
  const S = await import("../app/nacoes-unidas/produtos/sintomas-otc.ts");
  const { contarCasos } = await tolerante();
  const vocab = await vocabulario(false); // só o catálogo público, sem receita
  const casos = { "dor de cabeça": "dor de cabeça", "estou com febre": "febre", "dor de garganta": "dor de garganta", "gases": "gases", "colica": "cólica" };
  for (const [digitado, rotulo] of Object.entries(casos)) {
    const s = S.sintomaConhecido(digitado);
    assert.equal(s?.rotulo, rotulo, digitado);
    assert.ok(s.termos.some((t) => contarCasos(vocab, t) > 0), `${digitado}: nenhum produto sem receita`);
  }
  assert.equal(S.sintomaConhecido("shampoo"), null);
  // Nenhum termo da lista é antimicrobiano nem controlado.
  const proibidos = /amoxicilina|azitromicina|cefalexina|ciprofloxacino|clonazepam|alprazolam|rivotril|ritalina|tramadol|codeina/;
  for (const x of S.SINTOMAS_OTC.filter((y) => !y.comReceita)) for (const t of x.termos) assert.ok(!proibidos.test(t), t);
});

test("cobertura: jeitos de falar, palavra a mais e diminutivo sempre acham produto da loja", async () => {
  const { analisarConsulta, contarCasos } = await tolerante();
  const vocab = await vocabulario(true);
  const alt = (q) => analisarConsulta(vocab, q).alternativas;
  for (const [q, esperado] of [["fralda adulto", "fralda geriatrica"], ["tinta de cabelo", "tinta"], ["lamina de barbear", "barbear"], ["fita dental", "fio dental"], ["aparelho de pressao", "pressao"], ["glicosimetro", "glicos"]]) {
    const a = alt(q);
    assert.ok(a.some((x) => x.includes(esperado)), `${q} -> ${a.join(" | ")}`);
    assert.ok(a.every((x) => contarCasos(vocab, x) > 0), q);
  }
  // Palavra que a loja não conhece: mostra o que existe para as outras ("shampoo anticaspa" → shampoo).
  for (const [q, esperado, fora] of [["shampoo anticaspa", "shampoo", "anticaspa"], ["desodorante masculino", "desodorante", "masculino"], ["camisinha jontex", "preservativo", "jontex"], ["fralda recem nascido xyzw", "fralda", "xyzw"]]) {
    const a = analisarConsulta(vocab, q);
    assert.ok(a.parcial, q);
    assert.ok(a.parcial.consulta.includes(esperado), `${q} -> ${a.parcial.consulta}`);
    assert.ok(a.parcial.ignoradas.some((x) => x.includes(fora)), q);
    assert.ok(contarCasos(vocab, a.parcial.consulta) > 0, q);
  }
  assert.equal(analisarConsulta(vocab, "fraldinha").corrigida, "fralda");
  // Plural errado: "revetidos" volta a achar "revestidos" mesmo com a busca tirando o plural.
  assert.ok(analisarConsulta(vocab, "revetidos").corrigida || analisarConsulta(vocab, "revetidos").sugerida);
  // Busca de uma palavra só ou que já acha produto não ganha parcial.
  assert.equal(analisarConsulta(vocab, "xyzqwk").parcial, null);
});
