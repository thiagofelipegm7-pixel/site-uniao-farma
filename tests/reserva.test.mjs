import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";

const mod = () => import("../app/reserva/reserva-store.ts");
const nivea = { unitId: "nacoes", nome: "Loção Nivea Soft Milk 200ml", precoCentavos: 1990 };
const rollon = { unitId: "nacoes", nome: "Desodorante roll-on Nivea Protect 50ml", precoCentavos: 1290 };

test("preço em texto vira centavos e volta formatado", async () => {
  const { precoParaCentavos, formatarCentavos } = await mod();
  assert.equal(precoParaCentavos("R$ 19,90"), 1990);
  assert.equal(precoParaCentavos("1.234,50"), 123450);
  assert.equal(precoParaCentavos("abc"), null);
  assert.equal(precoParaCentavos("R$ 0,00"), null);
  assert.equal(formatarCentavos(1990), "R$ 19,90");
  assert.equal(formatarCentavos(5), "R$ 0,05");
  assert.equal(formatarCentavos(123450), "R$ 1.234,50");
});

test("adicionar soma a quantidade do mesmo item, ignora espaços e caixa no nome", async () => {
  const { ESTADO_VAZIO, adicionar, totalItens } = await mod();
  let s = adicionar(ESTADO_VAZIO, nivea);
  s = adicionar(s, { ...nivea, nome: "  loção nivea   soft milk 200ml " });
  assert.equal(s.itens.length, 1);
  assert.equal(s.itens[0].qtd, 2);
  assert.equal(totalItens(s), 2);
});

test("quantidade zero remove e há um teto por item; preço inválido não entra", async () => {
  const { ESTADO_VAZIO, adicionar, definirQtd, MAX_POR_ITEM } = await mod();
  let s = adicionar(ESTADO_VAZIO, nivea);
  const id = s.itens[0].id;
  s = definirQtd(s, id, 999);
  assert.equal(s.itens[0].qtd, MAX_POR_ITEM);
  s = definirQtd(s, id, 0);
  assert.equal(s.itens.length, 0);
  assert.equal(adicionar(ESTADO_VAZIO, { ...nivea, precoCentavos: 0 }).itens.length, 0);
});

test("subtotal e agrupamento por loja", async () => {
  const { ESTADO_VAZIO, adicionar, definirQtd, subtotalCentavos, porLoja } = await mod();
  let s = adicionar(ESTADO_VAZIO, nivea);
  s = adicionar(s, rollon);
  s = definirQtd(s, s.itens[1].id, 2);
  assert.equal(subtotalCentavos(s.itens), 1990 + 2 * 1290);
  s = adicionar(s, { unitId: "fatima", nome: "Listerine 500ml", precoCentavos: 2490 });
  const grupos = porLoja(s);
  assert.deepEqual(grupos.map((g) => [g.unitId, g.itens.length]), [["nacoes", 2], ["fatima", 1]]);
});

test("mensagem do WhatsApp lista itens, loja, forma, nome, pagamento e subtotal, e pede confirmação sem prometer estoque", async () => {
  const { ESTADO_VAZIO, adicionar, mensagemReserva } = await mod();
  const s = adicionar(ESTADO_VAZIO, nivea, 2);
  const retirar = mensagemReserva("Nações Unidas", s.itens, { modo: "retirar", nome: "  Maria  Souza " });
  assert.match(retirar, /^Olá, União Farma Nações Unidas! Quero pedir:/);
  assert.match(retirar, /\u2022 2x Loção Nivea Soft Milk 200ml/);
  assert.doesNotMatch(retirar, /Loja: /, "a loja já está na saudação");
  assert.match(retirar, /\u2022 2x Loção Nivea Soft Milk 200ml \u2014 R\$ 39,80/, "cada item traz o valor da linha");
  assert.match(retirar, /\n\n\*Itens\*\n/, "blocos separados por linha em branco");
  assert.match(retirar, /Se faltar algum item, podem sugerir outro parecido\?/);
  assert.doesNotMatch(retirar, /Produtos: /, "sem taxa não repete o subtotal");
  assert.match(retirar, /Forma: Retirar na loja/);
  assert.match(retirar, /Nome: Maria Souza/);
  assert.match(retirar, /Pagamento: a escolher/, "sem forma escolhida a prévia não promete balcão");
  assert.match(retirar, /Total estimado: R\$ 39,80/);
  assert.match(retirar, /Podem confirmar preço e estoque\? Obrigado!/);
  assert.doesNotMatch(retirar, /garant|reservado|em estoque/i);
  const casa = mensagemReserva("Nações Unidas", s.itens, { modo: "casa", nome: "Maria", bairro: "Nações Unidas", rua: "Rua Inglaterra, 100", taxaEntregaCentavos: 100 });
  assert.match(casa, /Forma: Entrega/);
  assert.match(casa, /Bairro: Nações Unidas/);
  assert.match(casa, /Endereço: Rua Inglaterra, 100/);
  assert.match(casa, /Pagamento: a escolher/);
  const comPix = mensagemReserva("Nações Unidas", s.itens, { modo: "casa", nome: "Maria", bairro: "Nações Unidas", rua: "Rua Inglaterra, 100", pagamento: "Pix" });
  assert.match(comPix, /Pagamento: Pix \(pelo WhatsApp\)/);
  assert.match(mensagemReserva("Nações Unidas", s.itens, { modo: "retirar", nome: "Maria", pagamento: "Cartão de débito" }), /Pagamento: Cartão de débito \(no balcão\)/);
  assert.match(casa, /Produtos: R\$ 39,80/);
  assert.match(casa, /Taxa de entrega: R\$ 1,00/);
  assert.match(casa, /Total estimado: R\$ 40,80/);
  assert.match(mensagemReserva("Fátima", s.itens, { modo: "retirar", nome: "" }), /Nome: \[nome do cliente\]/);
});

test("seleção da cesta: item desmarcado fica fora do total, da contagem e da mensagem; adicionar de novo marca", async () => {
  const { ESTADO_VAZIO, adicionar, definirSelecao, selecionarTodos, totalItens, subtotalCentavos, descontoCentavos, mensagemReserva, porLoja } = await mod();
  let s = adicionar(ESTADO_VAZIO, nivea, 2);
  s = adicionar(s, { ...rollon, deCentavos: 1590 });
  assert.equal(totalItens(s), 3);
  s = definirSelecao(s, s.itens[0].id, false);
  assert.equal(totalItens(s), 1);
  assert.equal(subtotalCentavos(s.itens), 1290);
  assert.equal(descontoCentavos(s.itens), 300);
  const msg = mensagemReserva("Nações Unidas", s.itens, { modo: "retirar", nome: "Ana" });
  assert.doesNotMatch(msg, /Nivea Soft Milk/);
  assert.match(msg, /1x Desodorante roll-on Nivea Protect/);
  assert.match(msg, /Subtotal estimado: R\$ 12,90|Total estimado: R\$ 12,90/);
  assert.deepEqual(porLoja(s).map((g) => g.itens.length), [1]);
  s = selecionarTodos(s, false);
  assert.equal(totalItens(s), 0);
  s = adicionar(s, nivea);
  assert.equal(s.itens[0].selecionado, true);
  assert.equal(s.itens[0].qtd, 3);
  s = selecionarTodos(s, true);
  assert.equal(totalItens(s), 4);
});

test("lerEstado descarta dados estragados e aceita o formato salvo", async () => {
  const { lerEstado, ESTADO_VAZIO, adicionar } = await mod();
  assert.deepEqual(lerEstado(null), ESTADO_VAZIO);
  assert.deepEqual(lerEstado("{não é json"), ESTADO_VAZIO);
  const bom = adicionar(ESTADO_VAZIO, nivea, 3);
  assert.deepEqual(lerEstado(JSON.stringify(bom)), bom);
  const ruim = { itens: [{ id: "x", unitId: "n", nome: "A", precoCentavos: -1, qtd: 1 }, { id: "y", unitId: "n", nome: "B", precoCentavos: 100, qtd: 9999 }], modo: "casa" };
  const lido = lerEstado(JSON.stringify(ruim));
  assert.equal(lido.itens.length, 0);
  assert.equal(lido.modo, "casa");
});

const read = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");

test("página /reserva: noindex, 3 passos como o protótipo, envio rastreado sem produto e sem dados pessoais no analytics", async () => {
  const [page, fluxo, sacola, hook] = await Promise.all([
    read("app/reserva/page.tsx"),
    read("app/reserva/ReservaFluxo.tsx"),
    read("app/reserva/ReservaSacola.tsx"),
    read("app/reserva/useReserva.ts"),
  ]);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(hook, /lerReservaServidor/);
  assert.match(fluxo, /aria-label=\{`Passo \$\{passo\} de 3`\}/);
  assert.match(fluxo, /Continuar: entrega ou retirada/);
  assert.match(fluxo, /Adicionar mais itens/);
  assert.doesNotMatch(fluxo, /não uma compra|Nada é cobrado|Cobrado neste site|Sem cobrança/);
  assert.match(fluxo, /Entrega ou retirada/);
  assert.match(fluxo, /Retire ou receba sua compra/);
  assert.match(fluxo, /Selecione uma opção/);
  assert.match(fluxo, /Entrega/);
  assert.match(fluxo, /Vendido e entregue por <strong>União Farma<\/strong>/);
  assert.match(fluxo, /Alterar/);
  assert.match(fluxo, /Revisar pedido/);
  assert.match(fluxo, /Prévia da mensagem/);
  assert.match(fluxo, /Forma de pagamento/);
  assert.match(fluxo, /FORMAS_PAGAMENTO/);
  assert.doesNotMatch(fluxo, /Depois de enviar/);
  assert.match(fluxo, /Enviar pedido pelo WhatsApp/);
  assert.match(fluxo, /Editar minha cesta/);
  assert.match(fluxo, /Sua cesta está vazia\./);
  assert.match(fluxo, /data-track-event="whatsapp_click"/);
  assert.match(fluxo, /data-track-source="reserva_envio"/);
  assert.doesNotMatch(fluxo, /data-track-(product|nome|name|item)=/);
  // Nome, rua e produto nunca vão ao analytics.
  assert.doesNotMatch(fluxo, /trackEvent\([^)]*(nome|rua|bairro\b[^,)]*item)/);
  assert.match(sacola, /Sua cesta está vazia\./);
  // A gaveta aberta no desktop se fecha sozinha quando o zoom deixa a página estreita (< 992 px).
  assert.match(sacola, /matchMedia\("\(max-width: 991\.98px\)"\)/);
  assert.match(sacola, /addEventListener\("change", aoMudar\)/);
  // A gaveta só lista e leva à /reserva.
  assert.doesNotMatch(sacola, /mensagemReserva/);
  // O responsável técnico e o aviso da Anvisa ficam só no rodapé do site.
  assert.doesNotMatch(sacola + fluxo, /TEXTO_RESPONSAVEL|Responsável técnico|Leia a bula/);
  for (const src of [page, fluxo, sacola]) assert.doesNotMatch(src, /Nivea|Listerine|Dipirona/);
});

test("reserva_add, reserva_revisar e o clique do WhatsApp entram no dataLayer sem nome de produto", async () => {
  const nome = "Loção Nivea Soft Milk 200ml";
  const dataLayer = [];
  const anteriorWindow = globalThis.window;
  const anteriorDocument = globalThis.document;
  globalThis.window = {
    dataLayer,
    location: { href: "https://uniao.example/reserva", pathname: "/reserva" },
    document: { title: "Minha reserva" },
  };
  globalThis.document = globalThis.window.document;
  try {
    await register(new URL("./resolve-ts.mjs", import.meta.url));
    const { trackEvent, getClickTrackingParams } = await import("../app/analytics.ts");
    trackEvent("reserva_add", { unit: "nacoes", source: "catalogo" });
    trackEvent("reserva_revisar", { modo: "retirar", itens: 2 });
    const ancora = {
      dataset: { trackEvent: "whatsapp_click", trackUnit: "nacoes", trackSource: "reserva_envio" },
      getAttribute(attr) {
        return attr === "href" ? `https://wa.me/5531987654321?text=${encodeURIComponent(nome)}` : null;
      },
      closest(sel) {
        if (sel === "[data-track-event]" || sel === "a[href]") return ancora;
        return null;
      },
    };
    const clique = getClickTrackingParams(ancora);
    assert.equal(clique.event, "whatsapp_click");
    assert.equal(clique.params.source, "reserva_envio");
    assert.equal(clique.params.unit, "nacoes");
    trackEvent(clique.event, clique.params);
    const eventos = dataLayer.map((item) => item.event);
    assert.ok(eventos.includes("reserva_add"));
    assert.ok(eventos.includes("reserva_revisar"));
    assert.ok(eventos.includes("whatsapp_click"));
    const serial = JSON.stringify(dataLayer);
    assert.equal(serial.includes(nome), false);
    assert.equal(serial.includes("Nivea"), false);
    assert.equal(serial.toLowerCase().includes("bairro"), false);
  } finally {
    globalThis.window = anteriorWindow;
    globalThis.document = anteriorDocument;
  }

  const [botao, pagina] = await Promise.all([
    read("app/reserva/ReservarBotao.tsx"),
    read("app/reserva/ReservaFluxo.tsx"),
  ]);
  assert.match(botao, /source = "catalogo"/);
  assert.match(botao, /trackEvent\("reserva_add", \{ unit: unitId, source \}\)/);
  assert.match(pagina, /trackEvent\("reserva_revisar", \{ modo, itens: estado\.itens\.filter\(itemAtivo\)\.length \}\)/);
  assert.doesNotMatch(botao, /trackEvent\("reserva_add", \{[^}]*nome/);
  assert.doesNotMatch(pagina, /trackEvent\("reserva_revisar", \{[^}]*nome/);
});


test("cesta com medicamento de receita ou controlado: só retirada, com a receita na mensagem", async () => {
  const { exigeReceita, mensagemReserva } = await import("../app/reserva/reserva-store.ts");
  const comum = { id: "a", unitId: "nacoes", nome: "SHAMPOO", precoCentavos: 1000, qtd: 1 };
  const rx = { id: "b", unitId: "nacoes", nome: "AMOXICILINA 500MG", precoCentavos: 2000, qtd: 1, receita: "receita" };
  const ctl = { id: "c", unitId: "nacoes", nome: "ALPRAZOLAM 1MG", precoCentavos: 1500, qtd: 2, receita: "controlado" };
  assert.equal(exigeReceita([comum]), false);
  assert.equal(exigeReceita([comum, rx]), true);
  assert.equal(exigeReceita([comum, { ...rx, selecionado: false }]), false); // item desmarcado não conta
  const msg = mensagemReserva("Nações Unidas", [comum, rx, ctl], { modo: "retirar", nome: "Maria", pagamento: "Pix" });
  assert.match(msg, /1x AMOXICILINA 500MG \(exige receita\)/);
  assert.match(msg, /2x ALPRAZOLAM 1MG \(controlado: receita retida na loja\)/);
  assert.match(msg, /Tem medicamento com receita: retiro na loja e apresento a receita\./);
  assert.doesNotMatch(mensagemReserva("Nações Unidas", [comum], { modo: "retirar", nome: "Maria" }), /receita/);
});

test("taxa de entrega por bairro informada pelo dono", async () => {
  const { taxaDoBairro } = await import("../app/reserva/reserva-store.ts");
  const esperado = { "Nações Unidas": 100, "General Carneiro": 200, "Vila Rica": 200, Itacolomi: 200, Coqueiros: 400, "Ipê Amarelo": 500, "Valparaíso": 300, "Vila São José": 200 };
  for (const [b, v] of Object.entries(esperado)) assert.equal(taxaDoBairro(b), v, b);
  assert.equal(taxaDoBairro("Outro lugar"), null);
  assert.equal(taxaDoBairro(undefined), null);
});

test("cesta: a quantidade nunca passa do que resta na loja (max)", async () => {
  const { adicionar, definirQtd, idDoItem, lerEstado, qtdDoItem, ESTADO_VAZIO } = await import("../app/reserva/reserva-store.ts");
  const id = idDoItem("nacoes", "Acetona Farmax 500 ml");
  let s = adicionar(ESTADO_VAZIO, { unitId: "nacoes", nome: "Acetona Farmax 500 ml", precoCentavos: 2190, max: 2 });
  s = definirQtd(s, id, 5);
  assert.equal(qtdDoItem(s, id), 2);
  s = adicionar(s, { unitId: "nacoes", nome: "Acetona Farmax 500 ml", precoCentavos: 2190, max: 2 });
  assert.equal(qtdDoItem(s, id), 2, "adicionar de novo também respeita o limite");
  // Quantidade inicial maior que o resta também é cortada.
  const t = adicionar(ESTADO_VAZIO, { unitId: "nacoes", nome: "X", precoCentavos: 100, max: 1 }, 4);
  assert.equal(qtdDoItem(t, idDoItem("nacoes", "X")), 1);
  // Sem max, o teto geral continua.
  const u = definirQtd(adicionar(ESTADO_VAZIO, { unitId: "nacoes", nome: "Y", precoCentavos: 100 }), idDoItem("nacoes", "Y"), 3);
  assert.equal(qtdDoItem(u, idDoItem("nacoes", "Y")), 3);
  // Estado salvo no navegador com quantidade acima do max é corrigido ao ler; max inválido é descartado.
  const lido = lerEstado(JSON.stringify({ modo: "retirar", itens: [{ id: "a", unitId: "nacoes", nome: "A", precoCentavos: 100, qtd: 4, max: 2 }, { id: "b", unitId: "nacoes", nome: "B", precoCentavos: 100, qtd: 3, max: -1 }] }));
  assert.equal(lido.itens[0].qtd, 2);
  assert.equal(lido.itens[1].qtd, 3);
  assert.equal(lido.itens[1].max, undefined);
});

test("fluxo do pedido fácil: textos sem 'escolher loja', pagamento pendente explicado e aviso para tocar em enviar", async () => {
  const fluxo = await readFile(new URL("../app/reserva/ReservaFluxo.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(fluxo, /escolher loja|loja que escolher/);
  assert.match(fluxo, /Escolha o pagamento/);
  assert.doesNotMatch(fluxo, /Falta só um passo/); // aviso removido a pedido da loja; só o lembrete da receita permanece
  assert.match(fluxo, /Confirmar nome/);
  assert.match(fluxo, /PUBLIC_UNITS\.length > 1 \? <input type="radio" name="loja"/);
});

test("pagamento: a prévia diz 'a escolher' até haver escolha", async () => {
  const { mensagemReserva } = await mod();
  const itens = [{ id: "n:x", unitId: "nacoes", nome: "X", precoCentavos: 1000, qtd: 1 }];
  assert.match(mensagemReserva("Nações Unidas", itens, { modo: "retirar", nome: "Ana" }), /Pagamento: a escolher/);
  assert.match(mensagemReserva("Nações Unidas", itens, { modo: "retirar", nome: "Ana", pagamento: "Pix" }), /Pagamento: Pix \(pelo WhatsApp\)/);
  const fluxo = await readFile(new URL("../app/reserva/ReservaFluxo.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(fluxo, /Você não paga nada pelo site/); // explicação removida a pedido da loja
});

test("dados do cliente: lembrados só no aparelho, validados ao ler e fáceis de esquecer", async () => {
  const { lerDadosCliente, CHAVE_CLIENTE } = await import("../app/reserva/dados-cliente.ts");
  assert.equal(CHAVE_CLIENTE, "uf-cliente-v1");
  assert.deepEqual(lerDadosCliente(JSON.stringify({ nome: "  Maria   Souza ", rua: "Rua A, 10", bairro: "Coqueiros", x: 1 })), { nome: "Maria Souza", rua: "Rua A, 10", bairro: "Coqueiros" });
  assert.equal(lerDadosCliente(JSON.stringify({ nome: "M" })), null, "nome curto demais");
  assert.equal(lerDadosCliente("não é json"), null);
  assert.equal(lerDadosCliente(null), null);
  const fluxo = await readFile(new URL("../app/reserva/ReservaFluxo.tsx", import.meta.url), "utf8");
  // A API de esquecer continua disponível no módulo; o fluxo ainda grava no aparelho.
  assert.match(await readFile(new URL("../app/reserva/dados-cliente.ts", import.meta.url), "utf8"), /export function esquecerDadosCliente/);
  assert.match(fluxo, /guardarDadosCliente\(retirar \? \{ nome \} : \{ nome, rua, bairro \}\)/);
  assert.doesNotMatch(await readFile(new URL("../app/analytics.ts", import.meta.url), "utf8"), /dados-cliente|uf-cliente/, "nunca vai ao analytics");
});

test("loja fechada avisa na hora de enviar; título das buscas e aba da loja sem 'sem receita'/'Lojas'", async () => {
  const fluxo = await readFile(new URL("../app/reserva/ReservaFluxo.tsx", import.meta.url), "utf8");
  assert.match(fluxo, /A loja está fechada agora/);
  assert.match(fluxo, /getUnitOpenStatus/);
  const pagina = await readFile(new URL("../app/nacoes-unidas/produtos/page.tsx", import.meta.url), "utf8");
  assert.match(pagina, /<h1 className="catalogo-titulo section-inner">Todos os produtos<\/h1>/);
  assert.match(await readFile(new URL("../app/MobileQuickNav.tsx", import.meta.url), "utf8"), /label: "A loja"/);
});

test("repetir pedido: usa o preço de hoje, mantém quantidade e receita e avisa o que não existe mais", async () => {
  const { repetirPedido, lerUltimoPedido } = await import("../app/reserva/ultimo-pedido.ts");
  const { qtdDoItem, idDoItem, ESTADO_VAZIO } = await mod();
  const anterior = [{ nome: "Dipirona 1g Cx 10CPR Medley", qtd: 2 }, { nome: "Item que acabou", qtd: 1 }, { nome: "Clonazepam 2mg", qtd: 1 }];
  const catalogo = [
    { nome: "dipirona 1g cx 10cpr medley", precoCentavos: 1300, foto: "/produtos/1.webp" },
    { nome: "Clonazepam 2mg", precoCentavos: 900, tipo: "controlados" },
  ];
  const r = repetirPedido(ESTADO_VAZIO, anterior, catalogo, "nacoes");
  assert.equal(qtdDoItem(r.estado, idDoItem("nacoes", "Dipirona 1g Cx 10CPR Medley")), 2);
  assert.equal(r.estado.itens.find((i) => i.nome.startsWith("Dipirona")).precoCentavos, 1300, "preço de hoje");
  assert.equal(r.estado.itens.find((i) => i.nome.startsWith("Clonazepam")).receita, "controlado");
  assert.deepEqual(r.faltaram, ["Item que acabou"]);
  assert.deepEqual(lerUltimoPedido("lixo"), []);
  assert.deepEqual(lerUltimoPedido(JSON.stringify([{ nome: "A", qtd: 99 }, { nome: "B", qtd: 1 }])), [{ nome: "B", qtd: 1 }]);
});

test("funil da cesta: etapas fixas, sem dados pessoais, porcentagens e gatilhos no fluxo", async () => {
  const { ETAPAS_FUNIL, etapaValida, montarFunil } = await import("../app/funil.ts");
  assert.deepEqual([...ETAPAS_FUNIL], ["add", "cesta", "entrega", "finalizar", "enviar"]);
  assert.equal(etapaValida("enviar"), true);
  assert.equal(etapaValida("nome"), false);
  assert.equal(etapaValida(undefined), false);
  const f = montarFunil({ add: 100, cesta: 60, entrega: 30, finalizar: 24, enviar: 18 });
  assert.deepEqual(f.map((l) => [l.etapa, l.total, l.doAnterior, l.doTopo]), [["add", 100, null, null], ["cesta", 60, 60, 60], ["entrega", 30, 50, 30], ["finalizar", 24, 80, 24], ["enviar", 18, 75, 18]]);
  assert.equal(montarFunil({}).every((l) => l.total === 0 && (l.doAnterior === null)), true, "sem dados não divide por zero");
  const fluxo = await readFile(new URL("../app/reserva/ReservaFluxo.tsx", import.meta.url), "utf8");
  for (const e of ["entrega", "finalizar", "enviar", "cesta"]) assert.match(fluxo, new RegExp(`registrarEtapa\\("${e}"\\)`));
  for (const f of ["app/reserva/ReservarBotao.tsx", "app/nacoes-unidas/produtos/ProdutoBarra.tsx", "app/reserva/CestaSugestoes.tsx"]) assert.match(await readFile(new URL(`../${f}`, import.meta.url), "utf8"), /registrarEtapa\("add"\)/);
  const api = await readFile(new URL("../app/api/funil/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(api, /nome|endereco|telefone|produto/i, "o funil não guarda dados pessoais");
  assert.match(await readFile(new URL("../middleware.ts", import.meta.url), "utf8"), /staffPath = [^;]*"\/api\/interno\/funil"/);
});

test("celular com letra grande: logo e ícones do topo em vw (pino não cobre o nome), abas e cartão marinho sem estourar", async () => {
  const css = await readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8");
  assert.match(css, /\.shop-marca \.marca-uf \.marca-uf-nome \{ font-size: min\(1\.75rem, 7vw\); \}/);
  assert.match(css, /\.shop-header \{ grid-template-columns: min\(2\.75rem, 12vw\) minmax\(0, 1fr\) auto; \}/);
  assert.match(css, /\.shop-abas a \{ flex: 1 1 auto;/);
  assert.match(css, /\.shop-hero \{ flex-wrap: wrap; \}/);
});

test("texto no celular nunca passa da caixa: botões quebram a linha e a trilha de navegação também", async () => {
  const css = await readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8");
  assert.match(css, /\.fluxo-botao, a\.fluxo-botao, button\.fluxo-botao, \.entrega-btn, \.shop-hero a/);
  assert.match(css, /white-space: normal !important; overflow-wrap: anywhere;/);
  assert.match(css, /@layer design \{\s*@media \(max-width: 991px\) \{\s*\.catalogo-caminho, \.produto-pagina \.catalogo-caminho\.produto-caminho \{ flex-wrap: wrap !important; \}/);
  assert.ok((await readFile(new URL("../tests/audit-texto-mobile.cjs", import.meta.url), "utf8")).includes("passa da caixa"), "auditoria presente");
});

test("iPhone: campos de texto e seletores com 16 px para o Safari não ampliar a página ao tocar", async () => {
  const css = await readFile(new URL("../app/shop/shop.css", import.meta.url), "utf8");
  assert.match(css, /\.shop-busca input, \.pv-ordenar select, select, input\[type="search"\], input\[type="text"\] \{ font-size: 16px !important; \}/);
  assert.match(css, /@layer design \{\s*\.shop-busca input, \.pv-ordenar select, select, input\[type="search"\], input\[type="text"\] \{ font-size: 16px !important; \}/);
  assert.ok((await readFile(new URL("../tests/audit-campos-ios.cjs", import.meta.url), "utf8")).includes("fs<16"));
});

test("pedido com receita: a mensagem diz se a foto vai na conversa ou se a receita vai na loja", async () => {
  const { mensagemReserva } = await import("../app/reserva/reserva-store.ts");
  const itens = [{ id: "nacoes:x", unitId: "nacoes", nome: "MED X", precoCentavos: 1000, qtd: 1, receita: "receita" }];
  const base = { modo: "retirar", nome: "Ana", pagamento: "Pix" };
  assert.match(mensagemReserva("Nações Unidas", itens, { ...base, receita: "foto" }), /vou enviar a foto da receita aqui na conversa/);
  assert.match(mensagemReserva("Nações Unidas", itens, { ...base, receita: "loja" }), /retiro na loja e apresento a receita/);
  assert.match(mensagemReserva("Nações Unidas", itens, base), /retiro na loja e apresento a receita/);
  assert.doesNotMatch(mensagemReserva("Nações Unidas", [{ ...itens[0], receita: undefined }], { ...base, receita: "foto" }), /receita/i, "sem medicamento de receita a frase não aparece");
});
