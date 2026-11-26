import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const A = await import("../app/avaliacao-google.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

const AGORA = Date.parse("2026-11-26T00:00:00-03:00");
const DIA = 86_400_000;
const ID = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const ID3 = "33333333-3333-4333-8333-333333333333";

test("pedir avaliação: consentimento precisa ser explícito; celular inválido não entra", () => {
  assert.equal(A.validarConsentimentoAvaliacao({ consentimento: "true", nome: "Ana Souza", telefone: "31987654321" }), null);
  assert.equal(A.validarConsentimentoAvaliacao({ nome: "Ana Souza", telefone: "31987654321" }), null);
  assert.equal(A.validarConsentimentoAvaliacao({ consentimento: true, nome: "Ana", telefone: "1188888888" }), null);
  assert.deepEqual(A.validarConsentimentoAvaliacao({ consentimento: true, nome: " Ana  Souza ", telefone: "31987654321" }), { nome: "Ana Souza", telefone: "5531987654321" });
  assert.equal(A.TEXTO_CONSENTIMENTO_AVALIACAO, "Depois da retirada ou da entrega, a loja pode me chamar no WhatsApp pedindo uma avaliação no Google");
});

test("pedir avaliação: mensagem curta, loja certa, sem produto, sem remédio, sem incentivo e sem desconto", () => {
  const linkFatima = A.linkEscreverAvaliacao("fatima");
  const linkNacoes = A.linkEscreverAvaliacao("nacoes");
  const linkItacolomi = A.linkEscreverAvaliacao("itacolomi");
  assert.equal(linkFatima, "https://search.google.com/local/writereview?placeid=ChIJ_ZzVyK6cpgAR-xi4EC94uOY");
  assert.equal(linkNacoes, "https://search.google.com/local/writereview?placeid=ChIJgRmPJJ6cpgAR3F5qwsuwne4");
  assert.equal(linkItacolomi, "https://search.google.com/local/writereview?placeid=ChIJx-yyFL-cpgARNU9SuMcVkd0");
  assert.equal(A.placeIdDaLoja("fatima"), "ChIJ_ZzVyK6cpgAR-xi4EC94uOY");
  const m = A.mensagemPedirAvaliacao("ANA SOUZA", "fatima");
  assert.equal(
    m,
    `Oi, Ana! Aqui é da União Farma Sabará. Obrigado pelo seu pedido na loja Fátima. Se gostou do atendimento, da retirada ou da entrega, você pode avaliar a loja no Google, se quiser: ${linkFatima}\n\nSe não quiser mais avisos, responda SAIR.`,
  );
  assert.match(A.mensagemPedirAvaliacao("Bia", "nacoes"), /loja Nações Unidas/);
  assert.match(A.mensagemPedirAvaliacao("Bia", "nacoes"), /writereview\?placeid=ChIJgRmPJJ6cpgAR3F5qwsuwne4/);
  assert.match(A.mensagemPedirAvaliacao("Cássio", "itacolomi"), /loja Itacolomi/);
  assert.doesNotMatch(m, /R\$|\d+,\d{2}|cura|trata|melhora|desconto|promo|brinde|ganhe|estrela|remédio|remedio|medicamento|saúde|saude|produto|Colgate|fralda|Dipirona/i);
  assert.match(A.linkWhatsApp("5531987654321", m), /^https:\/\/wa\.me\/5531987654321\?text=/);
  assert.equal(A.ESPERA_DIAS, 1);
  assert.equal(A.RETENCAO_DIAS, 7);
});

const linha = (extra = {}) => ({
  pre_venda_id: extra.pre_venda_id ?? ID,
  nome: extra.nome ?? "Ana Souza",
  telefone: extra.telefone ?? "5531987654321",
  consentido_em: extra.consentido_em ?? new Date(AGORA - 2 * DIA).toISOString(),
  status: extra.status ?? "pendente",
  unidade: extra.unidade ?? "fatima",
  modo: extra.modo ?? "retirar",
  status_pedido: extra.status_pedido ?? "concluida",
  pedido_atualizado_em: extra.pedido_atualizado_em ?? new Date(AGORA - 2 * DIA).toISOString(),
});

test("pedir avaliação: lista só 1 dia depois da venda concluída; um aviso por telefone; cancelada e recente ficam de fora", () => {
  const recente = linha({ pre_venda_id: ID2, pedido_atualizado_em: new Date(AGORA - 12 * 3_600_000).toISOString() });
  const pronta = linha();
  const outra = linha({
    pre_venda_id: ID3,
    telefone: "5531987654000",
    nome: "Bia Lima",
    unidade: "nacoes",
    modo: "casa",
    pedido_atualizado_em: new Date(AGORA - 3 * DIA).toISOString(),
  });
  const cancelada = linha({ pre_venda_id: "44444444-4444-4444-8444-444444444444", telefone: "5531911111111", status_pedido: "cancelada" });
  const aberta = linha({ pre_venda_id: "55555555-5555-4555-8555-555555555555", telefone: "5531922222222", status_pedido: "atendimento" });
  const jaEnviadaMesmoFone = linha({ pre_venda_id: "66666666-6666-4666-8666-666666666666", status: "enviado", pedido_atualizado_em: new Date(AGORA - 4 * DIA).toISOString() });
  const lista = A.montarListaAvaliacoes([recente, pronta, outra, cancelada, aberta, jaEnviadaMesmoFone], AGORA);
  assert.deepEqual(lista.map((l) => l.id), [ID3]);
  assert.equal(lista[0].rotulo, "Entrega da loja Nações Unidas");
  assert.match(lista[0].mensagem, /writereview\?placeid=ChIJgRmPJJ6cpgAR3F5qwsuwne4/);
  assert.doesNotMatch(lista[0].mensagem, /produto|remédio|desconto/i);
  const bloqueada = A.montarListaAvaliacoes([outra], AGORA, new Set(["5531987654000"]));
  assert.equal(bloqueada.length, 0);
  const soRetirada = A.montarListaAvaliacoes([pronta], AGORA);
  assert.equal(soRetirada[0].rotulo, "Retirada na loja Fátima");
  assert.equal(soRetirada[0].diasDesde, 2);
});

function bancoFalso() {
  const pedidos = new Map();
  const prevendas = new Map();
  const optout = new Map();
  return {
    pedidos,
    prevendas,
    optout,
    async exec() {},
    prepare(sql) {
      return {
        bind: (...v) => ({
          async run() {
            if (sql.startsWith("DELETE FROM avaliacao_google_pedido WHERE criado_em <")) {
              for (const [id, c] of pedidos) if (c.criado_em < v[0]) pedidos.delete(id);
            } else if (sql.startsWith("INSERT OR IGNORE INTO avaliacao_google_pedido")) {
              if (!pedidos.has(v[0])) {
                pedidos.set(v[0], {
                  pre_venda_id: v[0], nome: v[1], telefone: v[2], consentimento_texto: v[3], consentido_em: v[4],
                  status: "pendente", criado_em: v[5], atualizado_em: v[6],
                });
              }
            } else if (sql.includes("status = 'descartado'")) {
              const c = pedidos.get(v[1]);
              if (c?.status === "pendente") Object.assign(c, { status: "descartado", nome: "", telefone: "", atualizado_em: v[0] });
            } else if (sql.includes("status = 'enviado'")) {
              const c = pedidos.get(v[1]);
              if (c?.status === "pendente") Object.assign(c, { status: "enviado", atualizado_em: v[0] });
            }
            return { meta: { changes: 1 } };
          },
          async first() {
            if (sql.includes("FROM avaliacao_google_pedido WHERE pre_venda_id")) return pedidos.get(v[0]) ?? null;
            return null;
          },
          async all() {
            if (sql.includes("FROM recompra_optout")) return { results: [...optout.entries()].map(([telefone_hash, criado_em]) => ({ telefone_hash, criado_em })) };
            if (sql.includes("FROM avaliacao_google_pedido")) {
              const results = [];
              for (const c of pedidos.values()) {
                if (c.criado_em < v[0]) continue;
                const p = prevendas.get(c.pre_venda_id);
                if (!p) continue;
                results.push({
                  pre_venda_id: c.pre_venda_id,
                  nome: c.nome,
                  telefone: c.telefone,
                  consentido_em: c.consentido_em,
                  status: c.status,
                  unidade: p.unidade,
                  modo: p.modo,
                  status_pedido: p.status,
                  pedido_atualizado_em: p.atualizado_em,
                });
              }
              return { results };
            }
            return { results: [] };
          },
        }),
      };
    },
  };
}

test("pedir avaliação: grava só com consentimento; um aviso só; descarta apaga nome e telefone; some em 7 dias", async () => {
  const db = bancoFalso();
  const agora = new Date(AGORA);
  const consentimento = { nome: "Ana Souza", telefone: "5531987654321" };
  await A.gravarConsentimentoAvaliacao(db, ID, consentimento, agora);
  const linha = db.pedidos.get(ID);
  assert.equal(linha.consentimento_texto, A.TEXTO_CONSENTIMENTO_AVALIACAO);
  assert.equal(linha.status, "pendente");
  assert.ok(!("itens_json" in linha), "não guarda itens");
  assert.ok(!("mensagem" in linha), "não guarda o texto da mensagem");
  const deNovo = { ...db.pedidos.get(ID) };
  await A.gravarConsentimentoAvaliacao(db, ID, { nome: "Outra", telefone: "5531987654000" }, agora);
  assert.equal(db.pedidos.get(ID).nome, deNovo.nome, "INSERT OR IGNORE não sobrescreve");

  db.prevendas.set(ID, { unidade: "fatima", modo: "retirar", status: "concluida", atualizado_em: new Date(AGORA - 2 * DIA).toISOString() });
  const lista = await A.listarPedidosAvaliacao(db, AGORA);
  assert.equal(lista.pendentes.length, 1);
  assert.match(lista.pendentes[0].mensagem, /loja Fátima/);

  assert.equal(await A.marcarAvaliacao(db, ID, "enviado", agora), true);
  assert.equal(db.pedidos.get(ID).status, "enviado");
  assert.equal(await A.marcarAvaliacao(db, ID, "descartado", agora), false, "já enviado não descarta");
  const depois = await A.listarPedidosAvaliacao(db, AGORA);
  assert.equal(depois.pendentes.length, 0);
  assert.equal(depois.enviados, 1);

  const db2 = bancoFalso();
  await A.gravarConsentimentoAvaliacao(db2, ID2, consentimento, agora);
  db2.prevendas.set(ID2, { unidade: "itacolomi", modo: "casa", status: "concluida", atualizado_em: new Date(AGORA - 2 * DIA).toISOString() });
  assert.equal(await A.marcarAvaliacao(db2, ID2, "descartado", agora), true);
  const desc = db2.pedidos.get(ID2);
  assert.equal(desc.status, "descartado");
  assert.equal(desc.nome, "");
  assert.equal(desc.telefone, "");

  const db3 = bancoFalso();
  const antigo = new Date(AGORA - 8 * DIA);
  db3.pedidos.set(ID3, {
    pre_venda_id: ID3, nome: "Ana", telefone: "5531987654321", consentimento_texto: A.TEXTO_CONSENTIMENTO_AVALIACAO,
    consentido_em: antigo.toISOString(), status: "pendente", criado_em: antigo.toISOString(), atualizado_em: antigo.toISOString(),
  });
  db3.prevendas.set(ID3, { unidade: "fatima", modo: "retirar", status: "concluida", atualizado_em: antigo.toISOString() });
  await A.limparExpiradas(db3, agora);
  assert.equal(db3.pedidos.has(ID3), false);
});

test("pedir avaliação: checkout com caixa desmarcada, nada automático, e aba na área interna", async () => {
  const [fluxo, prevenda, interna, abas, priv, painel, pagina] = await Promise.all([
    ler("app/reserva/ReservaFluxo.tsx"),
    ler("app/api/pre-vendas/route.ts"),
    ler("app/api/interno/avaliacoes-google/route.ts"),
    ler("app/components/VendasAbas.tsx"),
    ler("app/privacidade/page.tsx"),
    ler("app/components/PainelAvaliacoesGoogle.tsx"),
    ler("app/interno/avaliacoes/page.tsx"),
  ]);
  assert.match(fluxo, /const \[querAvaliacao, setQuerAvaliacao\] = useState\(false\)/);
  assert.match(fluxo, /checked=\{querAvaliacao\}/);
  assert.match(fluxo, /\{TEXTO_CONSENTIMENTO_AVALIACAO\}/);
  assert.match(fluxo, /avaliacao: \{ consentimento: true/);
  assert.match(prevenda, /validarConsentimentoAvaliacao/);
  assert.match(prevenda, /gravarConsentimentoAvaliacao/);
  assert.match(interna, /listarPedidosAvaliacao/);
  assert.match(interna, /marcarAvaliacao/);
  assert.match(abas, /aba=avaliacoes/);
  assert.match(abas, /PainelAvaliacoesGoogle/);
  assert.match(pagina, /\/interno\/vendas\?aba=avaliacoes/);
  assert.match(priv, /pedido de avaliação no Google/i);
  assert.match(priv, /7 dias/);
  assert.match(priv, /não oferece desconto/i);
  assert.match(painel, /href=\{c\.link\}/);
  assert.match(painel, /Descartar/);
  assert.match(painel, /Marcar enviado/);
  assert.doesNotMatch(painel, /fetch\(["'`]https:\/\/(graph\.facebook|api\.whatsapp)/);
  for (const arq of [fluxo, prevenda, interna, painel]) {
    assert.doesNotMatch(arq, /fetch\(["'`]https:\/\/(graph\.facebook|api\.whatsapp)/, "nada é enviado automaticamente");
  }
});
