import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  aplicarEdicao,
  avisoEntrega,
  buscarNoCatalogo,
  esquecerColunasEdicao,
  garantirColunasEdicao,
  linkPedidoAtualizado,
  mensagemPedidoAtualizado,
  motivoBloqueio,
  validarAutor,
} from "../app/pedido-edicao.ts";

const ler = (c) => readFileSync(new URL(`../${c}`, import.meta.url), "utf8");
const ITENS = [
  { nome: "Shampoo Exemplo 300ml", quantidade: 1, precoCentavos: 1500 },
  { nome: "Condicionador Exemplo 300ml", quantidade: 2, precoCentavos: 1800 },
  { nome: "Sabonete Exemplo", quantidade: 3, precoCentavos: 250 },
];
const CATALOGO = { "creme-dental-exemplo": { slug: "creme-dental-exemplo", nome: "Creme Dental Exemplo", precoCentavos: 699 } };
const cat = (slug) => CATALOGO[slug] ?? null;

test("tirar um produto: recalcula o total e registra a mudança", () => {
  const r = aplicarEdicao(ITENS, [{ indice: 0, quantidade: 1 }, { indice: 2, quantidade: 3 }], cat);
  assert.equal(r.ok, true);
  assert.deepEqual(r.itens.map((i) => i.nome), ["Shampoo Exemplo 300ml", "Sabonete Exemplo"]);
  assert.equal(r.totalCentavos, 1500 + 750);
  assert.deepEqual(r.mudancas, ["Removido: Condicionador Exemplo 300ml"]);
});

test("mudar quantidade mantém o preço que o cliente viu; o navegador não manda preço", () => {
  const r = aplicarEdicao(ITENS, [{ indice: 0, quantidade: 4, precoCentavos: 1 }, { indice: 1, quantidade: 2 }, { indice: 2, quantidade: 3 }], cat);
  assert.equal(r.ok, true);
  assert.equal(r.itens[0].precoCentavos, 1500, "preço enviado pelo navegador é ignorado");
  assert.equal(r.totalCentavos, 6000 + 3600 + 750);
  assert.deepEqual(r.mudancas, ["Quantidade: Shampoo Exemplo 300ml de 1 para 4"]);
});

test("incluir do catálogo usa o preço do catálogo; slug desconhecido é recusado", () => {
  const r = aplicarEdicao(ITENS, [{ indice: 0, quantidade: 1 }, { indice: 1, quantidade: 2 }, { indice: 2, quantidade: 3 }, { slug: "creme-dental-exemplo", quantidade: 2, precoCentavos: 1 }], cat);
  assert.equal(r.ok, true);
  assert.deepEqual(r.itens.at(-1), { nome: "Creme Dental Exemplo", quantidade: 2, precoCentavos: 699 });
  assert.deepEqual(r.mudancas, ["Incluído: 2× Creme Dental Exemplo"]);
  assert.deepEqual(aplicarEdicao(ITENS, [{ slug: "nao-existe", quantidade: 1 }], cat).erro, "nao_encontrado_catalogo");
  assert.equal(aplicarEdicao(ITENS, [{ nome: "Livre", quantidade: 1, precoCentavos: 100 }], cat).erro, "item_invalido", "sem item com preço livre");
});

test("pedido nunca fica sem itens; quantidades e índices inválidos são recusados", () => {
  assert.equal(aplicarEdicao(ITENS, [], cat).erro, "sem_itens");
  assert.equal(aplicarEdicao(ITENS, [{ indice: 0, quantidade: 0 }], cat).erro, "item_invalido");
  assert.equal(aplicarEdicao(ITENS, [{ indice: 0, quantidade: 21 }], cat).erro, "item_invalido");
  assert.equal(aplicarEdicao(ITENS, [{ indice: 0, quantidade: 1.5 }], cat).erro, "item_invalido");
  assert.equal(aplicarEdicao(ITENS, [{ indice: 9, quantidade: 1 }], cat).erro, "item_invalido");
  assert.equal(aplicarEdicao(ITENS, [{ indice: 0, quantidade: 1 }, { indice: 0, quantidade: 1 }], cat).erro, "item_invalido", "mesmo item duas vezes");
  assert.equal(aplicarEdicao(ITENS, "x", cat).erro, "item_invalido");
  assert.equal(aplicarEdicao(ITENS, ITENS.map((_, indice) => ({ indice, quantidade: ITENS[indice].quantidade })), cat).erro, "sem_mudanca");
});

test("bloqueio: concluída, não fechou e entrega que já saiu; cotação e entregador chamado só avisam", () => {
  assert.match(motivoBloqueio("concluida", []), /concluída/);
  assert.match(motivoBloqueio("cancelada", []), /Não fechou/);
  assert.equal(motivoBloqueio("nova", []), null);
  assert.equal(motivoBloqueio("atendimento", [{ status: "cotada", temPedido: false }]), null);
  assert.equal(motivoBloqueio("nova", [{ status: "ON_GOING", temPedido: true }]), null);
  assert.equal(motivoBloqueio("nova", [{ status: "CANCELED", temPedido: true }]), null);
  for (const s of ["PICKED_UP", "COMPLETED", "pickup_complete", "dropoff", "delivered", "returned"]) assert.match(motivoBloqueio("nova", [{ status: s, temPedido: true }]), /saiu para entrega/, s);
  assert.match(motivoBloqueio("nova", [{ status: "ALGO_NOVO", temPedido: true }]), /desconhecido/);
  assert.match(avisoEntrega([{ status: "cotada", temPedido: false }]), /cotação/);
  assert.match(avisoEntrega([{ status: "pickup", temPedido: true }]), /entregador chamado/);
  assert.equal(avisoEntrega([{ status: "EXPIRED", temPedido: true }]), null);
  assert.equal(avisoEntrega([]), null);
});

test("quem alterou: nome curto obrigatório, sem marcação", () => {
  assert.equal(validarAutor("  Ana   Paula "), "Ana Paula");
  assert.equal(validarAutor("<b>Jo</b>"), "bJo/b");
  assert.equal(validarAutor("A"), null);
  assert.equal(validarAutor("x".repeat(41)), null);
  assert.equal(validarAutor(12), null);
});

test("mensagem do resumo novo: itens e total, sem promessa de saúde; o link só abre o WhatsApp", () => {
  const m = mensagemPedidoAtualizado({ codigo: "AB12", unidade: "nacoes", modo: "casa", itens: ITENS.slice(0, 1), totalCentavos: 1500 });
  assert.match(m, /pedido AB12/);
  assert.match(m, /1× Shampoo Exemplo 300ml: R\$\s?15,00/);
  assert.match(m, /Total dos produtos \(estimativa\): R\$\s?15,00/);
  assert.match(m, /taxa de entrega continua/);
  assert.doesNotMatch(m, /cura|trata|melhora|de R\$/i);
  assert.match(mensagemPedidoAtualizado({ codigo: "AB12", unidade: "nacoes", modo: "retirar", itens: ITENS, totalCentavos: 1 }), /pagamento é feito na loja/);
  assert.match(linkPedidoAtualizado("5531987654321", "Oi"), /^https:\/\/wa\.me\/5531987654321\?text=Oi$/);
  assert.equal(linkPedidoAtualizado(null, "Oi"), "https://wa.me/?text=Oi");
  assert.equal(linkPedidoAtualizado("javascript:1", "Oi"), "https://wa.me/?text=Oi");
});

test("busca no catálogo: todas as palavras, mínimo 2 letras, até 12", () => {
  const itens = Array.from({ length: 30 }, (_, i) => ({ slug: `s${i}`, busca: i % 2 ? `shampoo exemplo ${i}` : `sabonete ${i}` }));
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  assert.equal(buscarNoCatalogo(itens, "Shampôo exemplo", norm).length, 12);
  assert.equal(buscarNoCatalogo(itens, "s", norm).length, 0);
  assert.deepEqual(buscarNoCatalogo(itens, "sabonete 28", norm).map((i) => i.slug), ["s28"]);
});

test("colunas novas são só aditivas (ADD COLUMN) e não repetem as que existem", async () => {
  esquecerColunasEdicao();
  const sqls = [];
  const db = {
    exec: async (sql) => { sqls.push(sql); },
    prepare: () => ({ bind: () => ({ all: async () => ({ results: [{ name: "id" }, { name: "editado_em" }] }), run: async () => ({}), first: async () => null }) }),
  };
  await garantirColunasEdicao(db);
  assert.deepEqual(sqls, ["ALTER TABLE pre_venda ADD COLUMN editado_por TEXT", "ALTER TABLE pre_venda ADD COLUMN edicoes_json TEXT"]);
  esquecerColunasEdicao();
});

test("rota e tela: PUT recalcula no servidor, trava por versão, só pedido aberto; tela sem preço riscado", () => {
  const rota = ler("app/api/interno/pre-vendas/route.ts");
  assert.match(rota, /export async function PUT/);
  assert.match(rota, /WHERE id = \? AND atualizado_em = \? AND status IN \('nova', 'atendimento'\)/);
  assert.match(rota, /aplicarEdicao\(atuais, corpo\?\.itens, itemDoCatalogo\)/);
  const tela = ler("app/components/PedidoEditor.tsx") + ler("app/components/PreVendasPainel.tsx");
  assert.doesNotMatch(tela, /<s[\s>]|<del|line-through/, "sem preço riscado");
  assert.match(tela, /Editar itens/);
  assert.match(tela, /Tirar do pedido\?/);
  assert.doesNotMatch(tela, /type="number"[^>]*preco/i, "sem campo de preço livre");
  assert.doesNotMatch(ler("app/components/pedido-editor.css"), /line-through/);
  // A busca do catálogo fica atrás do login da equipe (middleware protege toda /api/interno/).
  assert.match(ler("middleware.ts"), /pathname\.startsWith\("\/api\/interno\/"\)/);
});
