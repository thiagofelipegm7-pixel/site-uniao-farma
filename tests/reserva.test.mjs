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
  assert.match(retirar, /Loja: Nações Unidas/);
  assert.match(retirar, /Forma: Retirar na loja/);
  assert.match(retirar, /Nome: Maria Souza/);
  assert.match(retirar, /Pagamento: no balcão/);
  assert.match(retirar, /Total estimado: R\$ 39,80/);
  assert.match(retirar, /Podem confirmar preço e estoque\? Obrigado!/);
  assert.doesNotMatch(retirar, /garant|reservado|em estoque/i);
  const casa = mensagemReserva("Nações Unidas", s.itens, { modo: "casa", nome: "Maria", bairro: "Nações Unidas", rua: "Rua Inglaterra, 100" });
  assert.match(casa, /Forma: Entrega/);
  assert.match(casa, /Bairro: Nações Unidas/);
  assert.match(casa, /Endereço: Rua Inglaterra, 100/);
  assert.match(casa, /Pagamento: na entrega/);
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
  assert.match(fluxo, /Passo \{passo\} de 3/);
  assert.match(fluxo, /Continuar: escolher loja/);
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
  assert.doesNotMatch(fluxo, /Depois de enviar/);
  assert.match(fluxo, /Enviar pedido pelo WhatsApp/);
  assert.match(fluxo, /Editar minha cesta/);
  assert.match(fluxo, /Vendido e entregue por <b>União Farma<\/b>/);
  assert.match(fluxo, /Sua cesta ainda está vazia\. Bora escolher\?/);
  assert.match(fluxo, /data-track-event="whatsapp_click"/);
  assert.match(fluxo, /data-track-source="reserva_envio"/);
  assert.doesNotMatch(fluxo, /data-track-(product|nome|name|item)=/);
  // Nome, rua e produto nunca vão ao analytics.
  assert.doesNotMatch(fluxo, /trackEvent\([^)]*(nome|rua|bairro\b[^,)]*item)/);
  assert.match(sacola, /Sua cesta ainda está vazia\. Bora escolher\?/);
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

