import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { esquecerColunasRetirada, garantirColunasRetirada, lerRetiradas, linkAvisoPronto, mensagemPronto, telefoneDoAviso } from "../app/retirada.ts";
import { UNITS } from "../app/site-config.ts";

const ler = (c) => readFileSync(new URL(`../${c}`, import.meta.url), "utf8");
const nacoes = UNITS.find((u) => u.id === "nacoes");

test("endereço da retirada vem do site-config: Rua Inglaterra, 162, Sabará", () => {
  assert.match(nacoes.address, /Rua Inglaterra, 162/);
  assert.match(nacoes.address, /Sabará/);
  const m = mensagemPronto({ codigo: "AB12", unidade: "nacoes", comReceita: false });
  assert.ok(m.includes(nacoes.address), "usa o endereço do site-config");
  assert.match(m, /pedido AB12 já está pronto para retirada/);
  assert.doesNotMatch(m, /receita/i);
  assert.doesNotMatch(m, /R\$|cura|trata|melhora/i, "sem preço e sem promessa de saúde");
  assert.match(mensagemPronto({ codigo: "AB12", unidade: "nacoes", comReceita: true }), /trazer a receita/);
});

test("telefone do aviso: só em retirada e só celular válido", () => {
  assert.equal(telefoneDoAviso("retirar", "(31) 9 8765-4321"), "5531987654321");
  assert.equal(telefoneDoAviso("casa", "(31) 9 8765-4321"), null);
  assert.equal(telefoneDoAviso("retirar", "3133334444"), null);
  assert.equal(telefoneDoAviso("retirar", ""), null);
  assert.equal(telefoneDoAviso("retirar", 31987654321), null);
});

test("link do WhatsApp abre a conversa do cliente com a mensagem; sem número, abre para escolher", () => {
  const m = "Olá!\nPronto";
  assert.equal(linkAvisoPronto("5531987654321", m), "https://wa.me/5531987654321?text=Ol%C3%A1!%0APronto");
  assert.equal(linkAvisoPronto(null, m), "https://wa.me/?text=Ol%C3%A1!%0APronto");
  assert.equal(linkAvisoPronto("javascript:alert(1)", m), "https://wa.me/?text=Ol%C3%A1!%0APronto");
});

function bancoFalso(linhas, colunas = ["id", "codigo"]) {
  const sqls = [];
  const db = {
    exec: async (sql) => { sqls.push(sql); },
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => ({}),
        first: async () => null,
        all: async () => {
          sqls.push(sql);
          if (sql.startsWith("PRAGMA")) return { results: colunas.map((name) => ({ name })) };
          return { results: linhas, v };
        },
      }),
    }),
  };
  return { db, sqls };
}

test("lerRetiradas cria as colunas novas e monta o link pronto sem expor o telefone cru", async () => {
  esquecerColunasRetirada();
  const agora = Date.parse("2026-11-19T15:00:00Z");
  const { db, sqls } = bancoFalso([
    { id: "a", codigo: "AB12", unidade: "nacoes", status: "nova", criado_em: "2026-11-19T14:00:00Z", itens_json: JSON.stringify([{ nome: "Exemplo", quantidade: 2, precoCentavos: 100 }]), total_centavos: 200, aviso_telefone: "5531987654321", com_receita: 1 },
    { id: "b", codigo: "CD34", unidade: "nacoes", status: "atendimento", criado_em: "2026-11-19T13:00:00Z", itens_json: "[]", total_centavos: 0, aviso_telefone: null, com_receita: 0 },
    { id: "c", codigo: "xx", unidade: "nacoes", status: "nova", criado_em: "2026-11-19T13:00:00Z", itens_json: "[]", total_centavos: 0 },
  ]);
  const r = await lerRetiradas(db, agora);
  assert.ok(sqls.some((s) => /ALTER TABLE pre_venda ADD COLUMN aviso_telefone TEXT/.test(s)));
  assert.ok(sqls.some((s) => /ALTER TABLE pre_venda ADD COLUMN com_receita/.test(s)));
  assert.ok(sqls.some((s) => /modo = 'retirar' AND status IN \('nova', 'atendimento'\)/.test(s)));
  assert.equal(r.length, 2, "linha com código estranho fica de fora");
  assert.equal(r[0].itens, 2);
  assert.equal(r[0].comReceita, true);
  assert.equal(r[0].temWhatsapp, true);
  assert.match(r[0].linkPronto, /^https:\/\/wa\.me\/5531987654321\?text=/);
  assert.equal("aviso_telefone" in r[0] || "telefone" in r[0], false);
  assert.equal(r[1].temWhatsapp, false);
  assert.match(r[1].linkPronto, /^https:\/\/wa\.me\/\?text=/);
  assert.equal(r[1].totalCentavos, null);
  // Segunda chamada não repete o PRAGMA.
  const antes = sqls.length;
  await garantirColunasRetirada(db);
  assert.equal(sqls.length, antes);
});

test("checkout, API e painel: retirada grátis, aviso opcional e nada enviado sozinho", () => {
  const fluxo = ler("app/reserva/ReservaFluxo.tsx");
  assert.match(fluxo, /Retirar na loja/);
  assert.match(fluxo, /\{u\.address\}/);
  assert.match(fluxo, /const taxaEntrega = retirar \? 0/);
  assert.match(fluxo, /retirar && avisoOk \? \{ avisoTelefone/);
  assert.match(fluxo, /TEXTO_AVISO_RETIRADA/);
  const api = ler("app/api/pre-vendas/route.ts");
  assert.match(api, /telefoneDoAviso\(modo, entrada\.avisoTelefone\)/);
  const patch = ler("app/api/interno/pre-vendas/route.ts");
  assert.match(patch, /aviso_telefone = NULL/);
  const painel = ler("app/components/PainelPedidos.tsx");
  assert.match(painel, /Avisar que está pronto/);
  assert.match(painel, /target="_blank"/);
  assert.match(painel, /Nada é enviado sozinho/);
  assert.doesNotMatch(painel, /fetch\([^)]*wa\.me/);
  assert.match(ler("app/privacidade/page.tsx"), /Aviso de retirada/);
});
