import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const R = await import("../app/recompra.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const DIA = 86_400_000;
const AGORA = Date.parse("2026-11-18T15:00:00Z");

// Catálogo e clientes fictícios.
const CATALOGO = [
  { nome: "FRALDA EXEMPLO FICTICIA G 30UN", categoria: "Infantil e Gestante", isMIP: false },
  { nome: "SHAMPOO TESTE 400ML", categoria: "Beleza", isMIP: false },
  { nome: "OMEGA 3 EXEMPLO 1000MG C/60 CAPS", categoria: "Bem Estar", isMIP: false },
  { nome: "DIPIRONA EXEMPLO 500MG 10CPR", categoria: "Medicamentos", isMIP: true },
  { nome: "ANTIACIDO EXEMPLO SACHE", categoria: "Medicamentos", isMIP: false },
  { nome: "CLORIDRATO DE PROMETAZINA 20mg/g crem derm bg", categoria: "Bem Estar", isMIP: false },
  { nome: "VITAMINA D3 50000ui CX 8CAPS GEL", categoria: "Bem Estar", isMIP: false },
  { nome: "XAROPE EXEMPLO INFANTIL 100ML", categoria: "Infantil e Gestante", isMIP: false },
  { nome: "TESTE GRAVIDEZ EXEMPLO", categoria: "Infantil e Gestante", isMIP: false },
  { nome: "LENCO EXEMPLO MIP-FREE", categoria: "Cuidado Diário", isMIP: true },
];

test("recompra: todo medicamento fica de fora, inclusive MIP e remédio fora da categoria", () => {
  const ok = (nome) => R.podeTerLembrete(CATALOGO.find((c) => c.nome === nome)).ok;
  assert.equal(ok("FRALDA EXEMPLO FICTICIA G 30UN"), true);
  assert.equal(ok("SHAMPOO TESTE 400ML"), true);
  assert.equal(ok("OMEGA 3 EXEMPLO 1000MG C/60 CAPS"), true, "suplemento alimentar entra");
  for (const nome of ["DIPIRONA EXEMPLO 500MG 10CPR", "ANTIACIDO EXEMPLO SACHE", "CLORIDRATO DE PROMETAZINA 20mg/g crem derm bg", "VITAMINA D3 50000ui CX 8CAPS GEL", "XAROPE EXEMPLO INFANTIL 100ML", "LENCO EXEMPLO MIP-FREE"]) {
    assert.equal(ok(nome), false, nome);
  }
  assert.equal(ok("TESTE GRAVIDEZ EXEMPLO"), false, "produto que expõe a saúde do cliente não vira mensagem");
  assert.equal(R.podeTerLembrete(null).ok, false, "item que não está no catálogo fica de fora");
  assert.equal(R.podeTerLembrete({ nome: "X", categoria: "Categoria a conferir", isMIP: false }).ok, false);
});

test("recompra: nenhum item do catálogo real que seja Medicamentos ou MIP passa no filtro", async () => {
  const { carregarCatalogoCompleto } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  const itens = carregarCatalogoCompleto().itens;
  const passaram = itens.filter((i) => R.podeTerLembrete(i).ok);
  assert.ok(passaram.length > 500, "fralda, higiene, beleza e suplemento continuam entrando");
  assert.equal(passaram.filter((i) => i.categoria === "Medicamentos" || i.isMIP).length, 0);
  assert.equal(passaram.filter((i) => /PROMETAZINA|NEOPIRIDIN|TILEMAXY|DELTAPIL|\d\s*UI\b|POMADA|XAROPE|GOTAS|-OTC/i.test(i.nome)).length, 0);
});

test("recompra: dias configuráveis por categoria, padrão 30", () => {
  assert.equal(R.DIAS_PADRAO, 30);
  assert.equal(R.diasDaCategoria("Infantil e Gestante"), R.DIAS_RECOMPRA_POR_CATEGORIA["Infantil e Gestante"]);
  assert.equal(R.diasDaCategoria("Categoria nova"), 30);
});

test("recompra: celular brasileiro vira 55+DDD+número; consentimento precisa ser true", () => {
  assert.equal(R.normalizarTelefone("(31) 9 0000-1234"), "5531900001234");
  assert.equal(R.normalizarTelefone("+55 31 90000-1234"), "5531900001234");
  for (const ruim of ["3133334444", "123", "(31) 9999-999", "31 99999 99999 9", 31900001234, "(31) 99999-9999"]) assert.equal(R.normalizarTelefone(ruim), null, String(ruim));
  assert.equal(R.validarLembrete({ consentimento: "true", nome: "Fulana Teste", telefone: "31900001234" }), null);
  assert.equal(R.validarLembrete({ nome: "Fulana Teste", telefone: "31900001234" }), null);
  assert.deepEqual(R.validarLembrete({ consentimento: true, nome: " Fulana  Teste ", telefone: "31900001234" }), { nome: "Fulana Teste", telefone: "5531900001234" });
});

test("recompra: mensagem pronta sem preço, sem promessa e com SAIR; link wa.me", () => {
  const m = R.mensagemRecompra("FULANA TESTE", ["FRALDA EXEMPLO FICTICIA G 30UN"]);
  assert.equal(m, "Oi, Fulana! Aqui é da União Farma Sabará. Faz um tempinho que você levou FRALDA EXEMPLO FICTICIA G 30UN. Se quiser repor, é só responder aqui ou pedir pelo site. Para não receber mais lembretes, responda SAIR.");
  assert.doesNotMatch(m, /R\$|\d+,\d{2}|cura|trata|melhora|desconto|promo/i);
  assert.match(R.mensagemRecompra("Ana", ["A", "B", "C"]), /levou A e mais 2 itens\./);
  assert.equal(R.linkWhatsApp("5531900001234", "Oi, Ana!"), "https://wa.me/5531900001234?text=Oi%2C%20Ana!");
});

const classificar = R.criarClassificador(CATALOGO);
const linha = (id, telefone, diasAtras, itens, extra = {}) => ({
  pre_venda_id: id, nome: "Cliente Fictício", telefone, consentido_em: new Date(AGORA - diasAtras * DIA).toISOString(), status: "pendente",
  criado_em: new Date(AGORA - diasAtras * DIA).toISOString(), itens_json: JSON.stringify(itens.map((nome) => ({ nome, quantidade: 1, precoCentavos: 100 }))), status_pedido: "concluida", ...extra,
});

test("recompra: lista quem comprou há ~30 dias, só itens não-medicamento, um por telefone", () => {
  const lista = R.montarLista([
    linha("a", "5531900000001", 31, ["FRALDA EXEMPLO FICTICIA G 30UN", "DIPIRONA EXEMPLO 500MG 10CPR"]),
    linha("b", "5531900000002", 31, ["DIPIRONA EXEMPLO 500MG 10CPR"]),
    linha("c", "5531900000003", 10, ["SHAMPOO TESTE 400ML"]),
    linha("d", "5531900000004", 60, ["SHAMPOO TESTE 400ML"]),
    linha("e", "5531900000005", 33, ["SHAMPOO TESTE 400ML"], { status_pedido: "cancelada" }),
    linha("f", "5531900000006", 32, ["SHAMPOO TESTE 400ML"], { status: "enviado" }),
    linha("g1", "5531900000007", 35, ["SHAMPOO TESTE 400ML"]),
    linha("g2", "5531900000007", 5, ["FRALDA EXEMPLO FICTICIA G 30UN"]),
    linha("h", "5531900000008", 30, ["OMEGA 3 EXEMPLO 1000MG C/60 CAPS"]),
    linha("i", "5531900000009", 30, ["SHAMPOO TESTE 400ML"]),
  ], AGORA, classificar, new Set(["5531900000009"]));
  assert.deepEqual(lista.map((l) => l.id), ["a", "h"]);
  assert.deepEqual(lista[0].produtos, ["FRALDA EXEMPLO FICTICIA G 30UN"], "a dipirona da mesma cesta não aparece");
  assert.doesNotMatch(lista[0].mensagem, /DIPIRONA/);
  assert.match(lista[0].link, /^https:\/\/wa\.me\/5531900000001\?text=/);
});

test("recompra: acha o item pelo nome corrigido no painel e respeita a categoria trocada pela equipe", async () => {
  const { chaveDoNome } = await import("../app/nomes-corrigidos.ts");
  const c = R.criarClassificador(CATALOGO, { [chaveDoNome("SHAMPOO TESTE 400ML")]: { nome: "Shampoo Teste Suave 400 ml" } }, { [chaveDoNome("FRALDA EXEMPLO FICTICIA G 30UN")]: { categoria: "Medicamentos" } });
  assert.equal(c("Shampoo Teste Suave 400 ml")?.categoria, "Beleza");
  assert.equal(c("FRALDA EXEMPLO FICTICIA G 30UN"), null);
});

function bancoFalso() {
  const contatos = new Map();
  const optout = new Map();
  return {
    contatos, optout,
    async exec() {},
    prepare(sql) {
      return { bind: (...v) => ({
        async run() {
          if (sql.startsWith("INSERT OR IGNORE INTO recompra_contato")) { if (!contatos.has(v[0])) contatos.set(v[0], { pre_venda_id: v[0], nome: v[1], telefone: v[2], consentimento_texto: v[3], consentido_em: v[4], status: "pendente" }); }
          else if (sql.startsWith("INSERT OR REPLACE INTO recompra_optout")) optout.set(v[0], v[1]);
          else if (sql.includes("SET status = 'enviado'")) { const c = contatos.get(v[1]); if (c?.status === "pendente") c.status = "enviado"; }
          else if (sql.includes("SET status = 'optout'") && sql.includes("WHERE telefone")) { for (const c of contatos.values()) if (c.telefone === v[1]) Object.assign(c, { status: "optout", nome: "", telefone: "" }); }
          else if (sql.includes("SET status = 'optout'")) { const c = contatos.get(v[1]); if (c) Object.assign(c, { status: "optout", nome: "", telefone: "" }); }
          return { meta: { changes: 1 } };
        },
        async first() { return sql.startsWith("SELECT telefone") ? (contatos.get(v[0]) ?? null) : null; },
        async all() { return { results: [] }; },
      }) };
    },
  };
}

test("recompra: consentimento guardado com o texto e a hora; SAIR apaga nome e telefone e bloqueia o número", async () => {
  const db = bancoFalso();
  const agora = new Date(AGORA);
  await R.gravarConsentimento(db, "11111111-1111-1111-1111-111111111111", { nome: "Cliente Fictício", telefone: "5531900000001" }, agora);
  await R.gravarConsentimento(db, "22222222-2222-2222-2222-222222222222", { nome: "Cliente Fictício", telefone: "5531900000001" }, agora);
  const c = db.contatos.get("11111111-1111-1111-1111-111111111111");
  assert.equal(c.consentimento_texto, R.TEXTO_CONSENTIMENTO);
  assert.equal(c.consentido_em, agora.toISOString());
  assert.equal(await R.marcarRecompra(db, "11111111-1111-1111-1111-111111111111", "enviado", agora), true);
  assert.equal(c.status, "enviado");
  assert.equal(await R.marcarRecompra(db, "11111111-1111-1111-1111-111111111111", "optout", agora), true);
  for (const x of db.contatos.values()) assert.deepEqual([x.status, x.nome, x.telefone], ["optout", "", ""]);
  assert.equal(db.optout.size, 1);
  assert.doesNotMatch([...db.optout.keys()][0], /5531900000001/, "o bloqueio guarda só um hash");
  assert.equal(await R.marcarRecompra(db, "33333333-3333-3333-3333-333333333333", "enviado", agora), false);
});

test("recompra: checkout com caixa DESMARCADA por padrão, celular só depois de marcar e nada sai sem consentimento", async () => {
  const [fluxo, rota, interna, nav, priv, painel] = await Promise.all([
    ler("app/reserva/ReservaFluxo.tsx"), ler("app/api/pre-vendas/route.ts"), ler("app/api/interno/recompra/route.ts"), ler("app/interno/itens-nav.ts"), ler("app/privacidade/page.tsx"), ler("app/components/PainelRecompra.tsx"),
  ]);
  assert.match(fluxo, /const \[querLembrete, setQuerLembrete\] = useState\(false\)/);
  assert.match(fluxo, /type="checkbox" checked=\{querLembrete\}/);
  assert.match(fluxo, /\{TEXTO_CONSENTIMENTO\}/);
  assert.equal(R.TEXTO_CONSENTIMENTO, "Quero receber lembrete pelo WhatsApp quando estiver na hora de repor meus produtos");
  assert.match(fluxo, /querLembrete && celularOk \? \{ lembrete: \{ consentimento: true/);
  assert.match(rota, /validarLembrete\(entrada\.lembrete\)/);
  assert.match(interna, /lerListaRecompra\(db/);
  assert.match(nav, /href: "\/interno\/recompra"/);
  assert.match(priv, /lembrete de recompra/i);
  assert.match(priv, /SAIR/);
  assert.match(painel, /href=\{c\.link\}/);
  assert.doesNotMatch(painel + interna, /fetch\(["'`]https:\/\/(graph\.facebook|api\.whatsapp)/, "nada é enviado automaticamente");
});
