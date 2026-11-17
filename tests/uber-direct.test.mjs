import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ErroUber,
  UBER_AUTH_URL,
  configUber,
  criarClienteUber,
  entregadorUber,
  esquecerTokenUber,
  mensagemErroUber,
  precoUber,
  uberModoTeste,
} from "../app/uber-direct.ts";

const CFG = { customerId: "cust-teste", clientId: "cli-teste", clientSecret: "seg-teste" };
const COLETA = { nome: "União Farma Nações Unidas", lat: -19.879422, lng: -43.866889, telefone: "+5531987629909" };
const DESTINO = { lat: -19.8775, lng: -43.864, endereco: "Rua Bélgica, 50, Nações Unidas, Sabará - MG, Brasil" };

function fetchFalso(respostas) {
  const chamadas = [];
  const f = async (url, init = {}) => {
    chamadas.push({ url: String(url), init });
    const proxima = respostas.shift();
    if (!proxima) throw new Error(`chamada inesperada: ${url}`);
    return new Response(proxima.body === undefined ? "" : JSON.stringify(proxima.body), { status: proxima.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return { f, chamadas };
}
const TOKEN = { body: { access_token: "tok-1", expires_in: 2592000, token_type: "Bearer", scope: "eats.deliveries" } };

test("configUber exige as três credenciais e uberModoTeste só sai do teste com UBER_DIRECT_AMBIENTE=producao", () => {
  const env = { UBER_DIRECT_CUSTOMER_ID: "a", UBER_DIRECT_CLIENT_ID: "b", UBER_DIRECT_CLIENT_SECRET: "c" };
  assert.deepEqual(configUber((n) => env[n] ?? ""), { customerId: "a", clientId: "b", clientSecret: "c" });
  assert.equal(configUber((n) => (n === "UBER_DIRECT_CLIENT_SECRET" ? "" : env[n] ?? "")), null);
  assert.equal(uberModoTeste(() => ""), true);
  assert.equal(uberModoTeste((n) => (n === "UBER_DIRECT_AMBIENTE" ? "producao" : "")), false);
});

test("cotar pede token client_credentials com escopo eats.deliveries e manda coleta fixa com coordenadas", async () => {
  esquecerTokenUber();
  const { f, chamadas } = fetchFalso([TOKEN, { body: { kind: "delivery_quote", id: "dqt_1", fee: 1050, currency: "brl", currency_type: "BRL", expires: "2026-11-17T18:25:43Z", duration: 22 } }]);
  const cotacao = await criarClienteUber(CFG, f).cotar(COLETA, DESTINO);
  assert.equal(cotacao.id, "dqt_1");
  assert.equal(chamadas[0].url, UBER_AUTH_URL);
  const form = new URLSearchParams(chamadas[0].init.body);
  assert.equal(form.get("grant_type"), "client_credentials");
  assert.equal(form.get("scope"), "eats.deliveries");
  assert.equal(chamadas[1].url, "https://api.uber.com/v1/customers/cust-teste/delivery_quotes");
  assert.equal(chamadas[1].init.headers.authorization, "Bearer tok-1");
  const corpo = JSON.parse(chamadas[1].init.body);
  assert.equal(JSON.parse(corpo.pickup_address).zip_code, "34590-010");
  assert.equal(corpo.pickup_latitude, -19.879422);
  assert.equal(corpo.dropoff_longitude, -43.864);
});

test("token fica guardado entre chamadas e é renovado uma vez quando a Uber responde 401", async () => {
  esquecerTokenUber();
  const { f, chamadas } = fetchFalso([
    TOKEN,
    { body: { id: "del_1", status: "pending" } },
    { body: { id: "del_1", status: "pickup" } },
    { status: 401, body: { code: "unauthorized" } },
    { body: { access_token: "tok-2", expires_in: 2592000 } },
    { body: { id: "del_1", status: "dropoff" } },
  ]);
  const uber = criarClienteUber(CFG, f);
  assert.equal((await uber.consultar("del_1")).status, "pending");
  assert.equal((await uber.consultar("del_1")).status, "pickup");
  assert.equal(chamadas.filter((c) => c.url === UBER_AUTH_URL).length, 1);
  assert.equal((await uber.consultar("del_1")).status, "dropoff");
  assert.equal(chamadas.filter((c) => c.url === UBER_AUTH_URL).length, 2);
  assert.equal(chamadas.at(-1).init.headers.authorization, "Bearer tok-2");
});

test("criar entrega usa a cotação e só liga o entregador simulado (Robo Courier) quando pedido", async () => {
  esquecerTokenUber();
  const { f, chamadas } = fetchFalso([TOKEN, { body: { id: "del_2", status: "pending" } }, { body: { id: "del_3", status: "pending" } }]);
  const uber = criarClienteUber(CFG, f);
  const base = { quoteId: "dqt_9", coleta: COLETA, destino: DESTINO, nome: "Cliente", telefone: "+5531999990001", observacao: "Apto 2", idExterno: "e-1" };
  await uber.criar({ ...base, simularEntregador: true });
  await uber.criar({ ...base, simularEntregador: false });
  const comRobo = JSON.parse(chamadas[1].init.body);
  const semRobo = JSON.parse(chamadas[2].init.body);
  assert.equal(chamadas[1].url, "https://api.uber.com/v1/customers/cust-teste/deliveries");
  assert.equal(comRobo.quote_id, "dqt_9");
  assert.equal(comRobo.pickup_phone_number, "+5531987629909");
  assert.equal(comRobo.dropoff_notes, "Apto 2");
  assert.deepEqual(comRobo.test_specifications, { robo_courier_specification: { mode: "auto" } });
  assert.equal("test_specifications" in semRobo, false);
});

test("cancelar usa POST .../cancel e erros da Uber viram ErroUber com o código", async () => {
  esquecerTokenUber();
  const { f, chamadas } = fetchFalso([TOKEN, { body: { id: "del_4", status: "canceled" } }, { status: 400, body: { code: "noncancelable_delivery", message: "x" } }]);
  const uber = criarClienteUber(CFG, f);
  assert.equal((await uber.cancelar("del_4")).status, "canceled");
  assert.equal(chamadas[1].url, "https://api.uber.com/v1/customers/cust-teste/deliveries/del_4/cancel");
  assert.equal(chamadas[1].init.method, "POST");
  await assert.rejects(uber.cancelar("del_4"), (e) => e instanceof ErroUber && e.codigo === "noncancelable_delivery" && e.status === 400);
  assert.match(mensagemErroUber("noncancelable_delivery"), /não deixa cancelar/);
  assert.equal(mensagemErroUber("nao_configurado"), "Integração Uber Direct não configurada.");
  assert.match(mensagemErroUber("codigo_novo"), /codigo_novo/);
});

test("preço vem em centavos e entregador usa só o que a Uber manda (sem placa inventada)", () => {
  assert.deepEqual(precoUber(1050, "brl"), { total: "10.50", moeda: "BRL" });
  assert.deepEqual(precoUber(undefined, undefined), { total: null, moeda: null });
  assert.equal(entregadorUber(null), null);
  assert.deepEqual(entregadorUber({ name: "Alex H.", phone_number: "+553130580531", vehicle_make: "Toyota", vehicle_model: "Prius", vehicle_color: "white" }), {
    nome: "Alex H.",
    telefone: "+553130580531",
    placa: null,
    veiculo: "Toyota Prius (white)",
  });
});

test("rota de entregas mantém a Lalamove como padrão e responde 503 por provedor sem chave", () => {
  const rota = readFileSync(new URL("../app/api/interno/entregas/route.ts", import.meta.url), "utf8");
  assert.match(rota, /Sem provedor no pedido vale a Lalamove/);
  assert.match(rota, /Integração \$\{NOME_PROVEDOR\[pedido\]\} não configurada/);
  assert.match(rota, /ALTER TABLE entrega_lalamove ADD COLUMN/);
  assert.match(rota, /DEFAULT 'lalamove'/);
  assert.match(rota, /RETENCAO_MS = 90 \* 86_400_000/);
  const painel = readFileSync(new URL("../app/components/PainelEntregas.tsx", import.meta.url), "utf8");
  assert.match(painel, /Integração Uber Direct não configurada/);
  assert.match(painel, /Integração Lalamove não configurada/);
});
