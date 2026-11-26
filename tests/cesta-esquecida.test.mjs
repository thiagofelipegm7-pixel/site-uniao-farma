import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const C = await import("../app/cesta-esquecida.ts");
const R = await import("../app/recompra.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

const AGORA = Date.parse("2026-11-25T23:00:00-03:00");
const HORA = 3_600_000;
const CATALOGO = [
  { nome: "FRALDA EXEMPLO FICTICIA G 30UN", categoria: "Infantil e Gestante", isMIP: false },
  { nome: "SHAMPOO TESTE 400ML", categoria: "Beleza", isMIP: false },
  { nome: "CREME DENTAL COLGATE EXEMPLO 90G", categoria: "Cuidado Diário", isMIP: false },
  { nome: "DIPIRONA EXEMPLO 500MG 10CPR", categoria: "Medicamentos", isMIP: true },
  { nome: "LENCO EXEMPLO MIP-FREE", categoria: "Cuidado Diário", isMIP: true },
];
const classificar = R.criarClassificador(CATALOGO);
const item = (nome, extra = {}) => ({ nome, quantidade: 1, precoCentavos: 850, ...extra });
const ID = "11111111-1111-4111-8111-111111111111";
const REQ = "22222222-2222-4222-8222-222222222222";

test("cesta esquecida: medicamento, MIP ou item incerto impedem a cesta inteira de entrar", () => {
  assert.equal(C.cestaPodeSerLembrada([item("CREME DENTAL COLGATE EXEMPLO 90G")], classificar).ok, true);
  assert.equal(C.cestaPodeSerLembrada([item("FRALDA EXEMPLO FICTICIA G 30UN"), item("SHAMPOO TESTE 400ML")], classificar).ok, true);
  assert.equal(C.cestaPodeSerLembrada([item("DIPIRONA EXEMPLO 500MG 10CPR")], classificar).ok, false);
  assert.equal(C.cestaPodeSerLembrada([item("LENCO EXEMPLO MIP-FREE")], classificar).ok, false);
  assert.equal(C.cestaPodeSerLembrada([item("CREME DENTAL COLGATE EXEMPLO 90G"), item("DIPIRONA EXEMPLO 500MG 10CPR")], classificar).ok, false, "cesta mista também fica de fora");
  assert.equal(C.cestaPodeSerLembrada([item("PRODUTO DESCONHECIDO FICTICIO")], classificar).ok, false);
  assert.equal(C.cestaPodeSerLembrada([], classificar).ok, false);
});

test("cesta esquecida: consentimento precisa ser explícito; celular inválido não entra", () => {
  assert.equal(C.validarConsentimentoCesta({ consentimento: "true", nome: "Ana Souza", telefone: "31987654321" }), null);
  assert.equal(C.validarConsentimentoCesta({ nome: "Ana Souza", telefone: "31987654321" }), null);
  assert.deepEqual(C.validarConsentimentoCesta({ consentimento: true, nome: " Ana  Souza ", telefone: "31987654321" }), { nome: "Ana Souza", telefone: "5531987654321" });
  assert.equal(C.TEXTO_CONSENTIMENTO_CESTA, "Se eu não terminar o pedido, a loja pode me chamar no WhatsApp com o link da cesta");
});

test("cesta esquecida: mensagem curta, com link, sem produto, sem preço, sem promessa e sem desconto", () => {
  const link = C.linkRetomada(ID);
  assert.equal(link, `https://uniãofarmasabará.com.br/reserva?cesta=${ID}`);
  const m = C.mensagemCestaEsquecida("ANA SOUZA", link);
  assert.equal(
    m,
    `Oi, Ana! Aqui é da União Farma Sabará. Você deixou uma cesta no site e não terminou o pedido. Se ainda quiser, retome por aqui: ${link}\n\nSe não quiser mais avisos, responda SAIR.`,
  );
  assert.doesNotMatch(m, /R\$|\d+,\d{2}|cura|trata|melhora|desconto|promo|Colgate|fralda|shampoo/i);
  assert.match(C.linkWhatsApp("5531987654321", m), /^https:\/\/wa\.me\/5531987654321\?text=/);
  assert.equal(C.ESPERA_HORAS, 2);
  assert.equal(C.RETENCAO_DIAS, 7);
});

const linha = (extra = {}) => ({
  id: extra.id ?? ID,
  request_id: extra.request_id ?? REQ,
  nome: extra.nome ?? "Ana Souza",
  telefone: extra.telefone ?? "5531987654321",
  consentido_em: extra.consentido_em ?? new Date(AGORA - 3 * HORA).toISOString(),
  status: extra.status ?? "aberta",
  itens_json: extra.itens_json ?? JSON.stringify([item("CREME DENTAL COLGATE EXEMPLO 90G")]),
  criado_em: extra.criado_em ?? new Date(AGORA - 3 * HORA).toISOString(),
  atualizado_em: extra.atualizado_em ?? new Date(AGORA - 3 * HORA).toISOString(),
});

test("cesta esquecida: lista só depois de 2 horas, sai se já virou aviso ou se foi enviada no mesmo telefone", () => {
  const recente = linha({ id: "33333333-3333-4333-8333-333333333333", atualizado_em: new Date(AGORA - HORA).toISOString() });
  const pronta = linha();
  const outra = linha({ id: "44444444-4444-4444-8444-444444444444", telefone: "5531987654000", nome: "Bia Lima", atualizado_em: new Date(AGORA - 5 * HORA).toISOString() });
  const jaEnviadaMesmoFone = linha({ id: "55555555-5555-4555-8555-555555555555", status: "enviada", atualizado_em: new Date(AGORA - 10 * HORA).toISOString() });
  const lista = C.montarListaCestas([recente, pronta, outra, jaEnviadaMesmoFone], AGORA);
  assert.deepEqual(lista.map((l) => l.id), ["44444444-4444-4444-8444-444444444444"]);
  assert.match(lista[0].mensagem, /uniãofarmasabará\.com\.br\/reserva\?cesta=/);
  assert.doesNotMatch(lista[0].mensagem, /CREME DENTAL/i);
  const bloqueada = C.montarListaCestas([outra], AGORA, new Set(["5531987654000"]));
  assert.equal(bloqueada.length, 0);
});

function bancoFalso() {
  const cestas = new Map();
  const optout = new Map();
  return {
    cestas,
    optout,
    async exec() {},
    prepare(sql) {
      return {
        bind: (...v) => ({
          async run() {
            if (sql.startsWith("DELETE FROM cesta_esquecida WHERE criado_em <")) {
              for (const [id, c] of cestas) if (c.criado_em < v[0]) cestas.delete(id);
            } else if (sql.startsWith("UPDATE cesta_esquecida SET nome = ?, telefone = ?, itens_json = ?, atualizado_em")) {
              const c = cestas.get(v[4]);
              if (c?.status === "aberta") Object.assign(c, { nome: v[0], telefone: v[1], itens_json: v[2], atualizado_em: v[3] });
            } else if (sql.startsWith("INSERT INTO cesta_esquecida")) {
              cestas.set(v[0], {
                id: v[0], request_id: v[1], nome: v[2], telefone: v[3], consentimento_texto: v[4], consentido_em: v[5],
                itens_json: v[6], status: "aberta", criado_em: v[7], atualizado_em: v[8],
              });
            } else if (sql.includes("status = 'descartada'")) {
              const c = cestas.get(v[1]);
              if (c?.status === "aberta") Object.assign(c, { status: "descartada", nome: "", telefone: "", itens_json: "[]", atualizado_em: v[0] });
            } else if (sql.includes("status = 'enviada'")) {
              const c = cestas.get(v[1]);
              if (c?.status === "aberta") Object.assign(c, { status: "enviada", atualizado_em: v[0] });
            } else if (sql.includes("status = 'convertida'") && sql.includes("request_id")) {
              for (const c of cestas.values()) if (c.request_id === v[1] && c.status === "aberta") Object.assign(c, { status: "convertida", nome: "", telefone: "", itens_json: "[]", atualizado_em: v[0] });
            } else if (sql.includes("status = 'convertida'") && sql.includes("telefone")) {
              for (const c of cestas.values()) if (c.telefone === v[1] && c.status === "aberta") Object.assign(c, { status: "convertida", nome: "", telefone: "", itens_json: "[]", atualizado_em: v[0] });
            }
            return { meta: { changes: 1 } };
          },
          async first() {
            if (sql.includes("FROM recompra_optout") && !sql.startsWith("SELECT telefone_hash")) return null;
            if (sql.includes("WHERE request_id")) return [...cestas.values()].find((c) => c.request_id === v[0]) ?? null;
            if (sql.includes("status = 'enviada'")) return [...cestas.values()].find((c) => c.telefone === v[0] && c.status === "enviada" && c.criado_em >= v[1]) ?? null;
            if (sql.includes("FROM cesta_esquecida WHERE id")) return cestas.get(v[0]) ?? null;
            return null;
          },
          async all() {
            if (sql.includes("FROM recompra_optout")) return { results: [...optout.entries()].map(([telefone_hash, criado_em]) => ({ telefone_hash, criado_em })) };
            if (sql.includes("FROM cesta_esquecida")) return { results: [...cestas.values()].filter((c) => c.criado_em >= v[0]) };
            return { results: [] };
          },
        }),
      };
    },
  };
}

test("cesta esquecida: grava só com consentimento e item permitido; vira convertida ao fechar o pedido; um aviso só", async () => {
  const db = bancoFalso();
  const agora = new Date(AGORA);
  const consentimento = { nome: "Ana Souza", telefone: "5531987654321" };
  const itens = [item("CREME DENTAL COLGATE EXEMPLO 90G")];
  const gravada = await C.gravarCestaEsquecida(db, { requestId: REQ, consentimento, itens, classificar }, agora);
  assert.equal(gravada.ok, true);
  const recusa = await C.gravarCestaEsquecida(db, { requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", consentimento, itens: [item("DIPIRONA EXEMPLO 500MG 10CPR")], classificar }, agora);
  assert.deepEqual(recusa, { ok: false, motivo: "medicamento" });
  const id = gravada.ok ? gravada.id : "";
  const linha = [...db.cestas.values()][0];
  assert.equal(linha.consentimento_texto, C.TEXTO_CONSENTIMENTO_CESTA);
  assert.equal((await C.itensParaRetomada(db, id, agora))?.[0].nome, "CREME DENTAL COLGATE EXEMPLO 90G");
  assert.equal(await C.marcarCesta(db, id, "enviada", agora), true);
  assert.equal(linha.status, "enviada");
  assert.equal(await C.marcarCesta(db, id, "descartada", agora), false, "já enviada não descarta");
  const nova = await C.gravarCestaEsquecida(db, { requestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", consentimento, itens, classificar }, agora);
  assert.deepEqual(nova, { ok: false, motivo: "ja_avisado" });

  const db2 = bancoFalso();
  const g2 = await C.gravarCestaEsquecida(db2, { requestId: REQ, consentimento, itens, classificar }, agora);
  assert.equal(g2.ok, true);
  await C.marcarCestaConvertida(db2, { requestId: REQ }, agora);
  const convertida = [...db2.cestas.values()][0];
  assert.equal(convertida.status, "convertida");
  assert.equal(convertida.telefone, "");
  assert.equal(await C.itensParaRetomada(db2, g2.ok ? g2.id : "", agora), null);
});

test("cesta esquecida: checkout com caixa desmarcada, nada automático, e pedido fechado tira da lista", async () => {
  const [fluxo, publica, interna, abas, priv, painel, prevenda] = await Promise.all([
    ler("app/reserva/ReservaFluxo.tsx"),
    ler("app/api/cesta-esquecida/route.ts"),
    ler("app/api/interno/cestas-esquecidas/route.ts"),
    ler("app/components/VendasAbas.tsx"),
    ler("app/privacidade/page.tsx"),
    ler("app/components/PainelCestasEsquecidas.tsx"),
    ler("app/api/pre-vendas/route.ts"),
  ]);
  assert.match(fluxo, /const \[querAvisoCesta, setQuerAvisoCesta\] = useState\(false\)/);
  assert.match(fluxo, /checked=\{querAvisoCesta\}/);
  assert.match(fluxo, /\{TEXTO_CONSENTIMENTO_CESTA\}/);
  assert.match(fluxo, /enviarCestaEsquecida/);
  assert.match(publica, /validarConsentimentoCesta/);
  assert.match(publica, /cestaPodeSerLembrada/);
  assert.match(interna, /listarCestasEsquecidas/);
  assert.match(abas, /aba=cestas/);
  assert.match(priv, /não terminar o pedido/i);
  assert.match(priv, /7 dias/);
  assert.match(painel, /href=\{c\.link\}/);
  assert.match(painel, /Descartar/);
  assert.match(prevenda, /marcarCestaConvertida/);
  for (const arq of [fluxo, publica, interna, painel]) {
    assert.doesNotMatch(arq, /fetch\(["'`]https:\/\/(graph\.facebook|api\.whatsapp)/, "nada é enviado automaticamente");
  }
});
