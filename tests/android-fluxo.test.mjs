import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

const local = process.env.UF_ANDROID_TEST_URL;

test("contrato Android com catálogo, entrega e painel D1 local", { skip: !local }, async () => {
  const origem = new URL(local);
  assert.ok(["localhost", "127.0.0.1"].includes(origem.hostname), "Use somente um Worker local com D1 de teste.");
  const senha = process.env.STAFF_PASSWORD;
  assert.ok(senha, "Defina a senha da equipe para este Worker de teste.");
  const api = (path, options) => fetch(new URL(path, origem), { redirect: "manual", ...options });
  const post = (path, payload) => api(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const consulta = await api("/api/android/catalogo");
  assert.equal(consulta.status, 200);
  const { unidades, itens } = await consulta.json();
  assert.deepEqual(unidades.map((unit) => unit.id), ["nacoes"]);
  assert.equal(new Set(itens.map((p) => p.id)).size, itens.length);
  const produto = itens.find((p) => p.foto && !p.receita && p.limite >= 2);
  assert.ok(produto);
  assert.equal((await api(produto.foto)).status, 200);
  const ofertas = await (await api("/api/ofertas")).json();
  for (const oferta of ofertas.itens) {
    assert.ok(itens.some((p) => p.nome === oferta.nome && p.foto === oferta.foto && p.precoCentavos === oferta.precoCentavos));
  }
  const esgotado = itens.find((p) => p.nivel === 0 && p.precoCentavos > 0);
  assert.ok(esgotado);
  assert.equal(esgotado.limite, 0);

  const rota = "/api/android/pre-vendas";
  const pedido = {
    requestId: randomUUID(), unidade: "nacoes", modo: "retirar", taxaCentavos: 0,
    itens: [{ id: produto.id, qtd: 1, precoCentavos: produto.precoCentavos }],
  };
  assert.equal((await post(rota, { ...pedido, unidade: "itacolomi" })).status, 400);
  assert.equal((await post(rota, { ...pedido, modo: "casa", bairro: "Sem cobertura" })).status, 409);
  assert.equal((await post(rota, { ...pedido, itens: [{ ...pedido.itens[0], precoCentavos: 1 }] })).status, 409);
  assert.equal((await post(rota, { ...pedido, itens: [{ id: esgotado.id, qtd: 1, precoCentavos: esgotado.precoCentavos }] })).status, 409);

  const resposta = await post(rota, pedido);
  assert.equal(resposta.status, 201);
  const recebido = await resposta.json();
  const link = new URL(recebido.whatsapp);
  assert.equal(link.origin, "https://wa.me");
  assert.match(link.searchParams.get("text"), new RegExp(`#${recebido.codigo}`));
  assert.match(link.searchParams.get("text"), /confirmar preço e estoque/);
  assert.deepEqual(await (await post(rota, pedido)).json(), recebido);
  assert.equal((await post(rota, { ...pedido, itens: [{ ...pedido.itens[0], qtd: 2 }] })).status, 409);

  const area = unidades[0].bairros[0];
  const entrega = await post(rota, {
    ...pedido, requestId: randomUUID(), modo: "casa", bairro: area.nome, taxaCentavos: area.taxaCentavos,
  });
  assert.equal(entrega.status, 201);
  const entregue = await entrega.json();
  assert.ok(new URL(entregue.whatsapp).searchParams.get("text").includes(`Bairro: ${area.nome}`));

  const web = {
    requestId: randomUUID(), codigo: randomUUID().slice(0, 4).toUpperCase(), unidade: "nacoes", modo: "retirar",
    itens: [{ nome: produto.nome, quantidade: 1, precoCentavos: produto.precoCentavos }],
  };
  assert.equal((await post("/api/pre-vendas", web)).status, 201);

  const painel = "/api/interno/pre-vendas";
  assert.ok([302, 303, 307, 308, 401, 403].includes((await api(painel)).status));
  const login = await api("/api/interno/login", {
    method: "POST",
    body: new URLSearchParams({ user: process.env.STAFF_USER || "uniao", pass: senha, next: "/interno/pre-vendas" }),
  });
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "O login local deve criar a sessão da equipe.");
  const dados = await api(painel, { headers: { cookie } });
  assert.equal(dados.status, 200);
  const { preVendas } = await dados.json();
  assert.ok(preVendas.some((row) => row.codigo === web.codigo && row.modo === "retirar"));
  const retirada = preVendas.filter((row) => row.codigo === recebido.codigo);
  assert.equal(retirada.length, 1);
  assert.equal(retirada[0].status, "nova");
  assert.deepEqual(retirada[0].itens, [{ nome: produto.nome, quantidade: 1, precoCentavos: produto.precoCentavos }]);
  const atualizar = await api(painel, {
    method: "PATCH",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ id: retirada[0].id, status: "atendimento" }),
  });
  assert.equal(atualizar.status, 200);
  const atualizado = await (await api(painel, { headers: { cookie } })).json();
  assert.equal(atualizado.preVendas.find((row) => row.id === retirada[0].id).status, "atendimento");
  const linhaEntrega = preVendas.find((row) => row.codigo === entregue.codigo && row.modo === "casa");
  assert.ok(linhaEntrega);
  assert.equal(linhaEntrega.totalCentavos, produto.precoCentavos);
});
