import assert from "node:assert/strict";
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

test("mensagem do WhatsApp lista os itens, o subtotal e pede confirmação sem prometer estoque", async () => {
  const { ESTADO_VAZIO, adicionar, mensagemReserva } = await mod();
  let s = adicionar(ESTADO_VAZIO, nivea, 2);
  const retirar = mensagemReserva("Nações Unidas", s.itens, "retirar");
  assert.match(retirar, /^Oi, União Farma Nações Unidas! Quero reservar:/);
  assert.match(retirar, /2x Loção Nivea Soft Milk 200ml \(R\$ 19,90\)/);
  assert.match(retirar, /Subtotal estimado: R\$ 39,80\./);
  assert.match(retirar, /retirar na loja e pagar no balcão/);
  assert.match(retirar, /confirmar preço e disponibilidade/);
  assert.doesNotMatch(retirar, /garant|reservado|em estoque/i);
  assert.match(mensagemReserva("Nações Unidas", s.itens, "casa"), /receber em casa e pagar na entrega/);
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
