import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (caminho) => readFile(new URL(`../${caminho}`, import.meta.url), "utf8");
const modulo = () => import("../app/limite-visitante.ts");

function pedido(ip, extras = {}) {
  return new Request("https://xn--uniofarmasabar-8gbu.com.br/api/pre-vendas", {
    method: "POST",
    headers: { "cf-connecting-ip": ip, ...extras },
  });
}

/** Banco de mentira: incrementa n por chave+janela, como o D1 faria no INSERT ... RETURNING n. */
function bancoFake({ falhar = false } = {}) {
  const linhas = new Map();
  let apagouAte = null;
  return {
    linhas,
    get apagouAte() {
      return apagouAte;
    },
    prepare(sql) {
      return {
        bind(...valores) {
          return {
            async run() {
              if (falhar) throw new Error("banco fora");
              if (/DELETE FROM limite_pre_venda/.test(sql)) apagouAte = valores[0];
            },
            async first() {
              if (falhar) throw new Error("banco fora");
              if (/RETURNING n/.test(sql)) {
                const [chave, janela] = valores;
                const id = `${chave}|${janela}`;
                const n = (linhas.get(id) ?? 0) + 1;
                linhas.set(id, n);
                return { n };
              }
              return null;
            },
          };
        },
      };
    },
  };
}

test("teto da cesta: 30 envios em 10 minutos e corpo de até 16 KB", async () => {
  const L = await modulo();
  assert.equal(L.PRE_VENDA_MAX_POR_VISITANTE, 30);
  assert.equal(L.PRE_VENDA_JANELA_MS, 10 * 60 * 1000);
  assert.equal(L.PRE_VENDA_TAMANHO_MAX, 16_000);
  assert.equal(L.corpoPreVendaGrandeDemais(16_000), false);
  assert.equal(L.corpoPreVendaGrandeDemais(16_001), true);
  assert.equal(L.corpoPreVendaGrandeDemais(0), false);
});

test("visitante vem do IP da Cloudflare, com recuo para o encaminhado", async () => {
  const { visitanteDaRequisicao } = await modulo();
  assert.equal(visitanteDaRequisicao(pedido("201.1.2.3")), "201.1.2.3");
  assert.equal(
    visitanteDaRequisicao(new Request("https://exemplo.test/", { headers: { "x-forwarded-for": "201.9.9.9, 10.0.0.1" } })),
    "201.9.9.9",
  );
  assert.equal(visitanteDaRequisicao(new Request("https://exemplo.test/")), "unknown");
});

test("resposta 429 é amigável, sem cache, e pede para esperar 10 minutos", async () => {
  const { respostaLimitePreVenda } = await modulo();
  const r = respostaLimitePreVenda();
  assert.equal(r.status, 429);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.headers.get("Retry-After"), "600");
  assert.deepEqual(await r.json(), { ok: false, erro: "limite" });
});

test("limite na memória: o 31º envio do mesmo visitante é recusado; outro visitante passa", async () => {
  const { criarControlePreVenda } = await modulo();
  let agora = 1_000;
  const permitir = criarControlePreVenda({ agora: () => agora });
  for (let i = 0; i < 30; i += 1) assert.equal(await permitir(pedido("1.1.1.1"), null), true, `envio ${i + 1}`);
  assert.equal(await permitir(pedido("1.1.1.1"), null), false);
  assert.equal(await permitir(pedido("2.2.2.2"), null), true);
  agora += 10 * 60 * 1000;
  assert.equal(await permitir(pedido("1.1.1.1"), null), true);
});

test("limite no banco vale entre instâncias e não guarda o IP", async () => {
  const { criarControlePreVenda, dentroDoLimitePreVendaCompartilhado } = await modulo();
  const db = bancoFake();
  let agora = 5_000;
  const permitirA = criarControlePreVenda({ agora: () => agora });
  const permitirB = criarControlePreVenda({ agora: () => agora });
  for (let i = 0; i < 15; i += 1) assert.equal(await permitirA(pedido("8.8.8.8"), db), true);
  for (let i = 0; i < 15; i += 1) assert.equal(await permitirB(pedido("8.8.8.8"), db), true);
  assert.equal(await permitirA(pedido("8.8.8.8"), db), false);
  assert.equal([...db.linhas.values()].pop(), 31);
  for (const chave of db.linhas.keys()) {
    assert.equal(chave.includes("8.8.8.8"), false);
    assert.match(chave, /^[0-9a-f]{24}\|/);
  }
  // Sem banco, uma falha não derruba o cliente (o teto da memória ainda vale).
  assert.equal(await dentroDoLimitePreVendaCompartilhado(bancoFake({ falhar: true }), "8.8.8.8"), true);
  assert.equal(await dentroDoLimitePreVendaCompartilhado(null, "8.8.8.8"), true);
});

test("a rota aplica o limite e o tamanho do corpo; a cesta não espera essa resposta para abrir o WhatsApp", async () => {
  const [rota, fluxo] = await Promise.all([ler("app/api/pre-vendas/route.ts"), ler("app/reserva/ReservaFluxo.tsx")]);
  assert.match(rota, /permitirPreVenda\(request, banco\(\)/);
  assert.match(rota, /respostaLimitePreVenda\(\)/);
  assert.match(rota, /corpoPreVendaGrandeDemais\(tamanho\)/);
  assert.match(rota, /corpoPreVendaGrandeDemais\(bruto\.length\)/);
  assert.match(fluxo, /navigator\.sendBeacon\?\.\(\s*"\/api\/pre-vendas"/);
  assert.match(fluxo, /keepalive: true \}\)\.catch\(\(\) => \{\}\)/);
  const concluir = fluxo.slice(fluxo.indexOf("function concluirEnvio()"), fluxo.indexOf("function confirmarEnvio()"));
  assert.match(concluir, /registrarPreVenda\(\);/);
  assert.doesNotMatch(concluir, /await registrarPreVenda/);
  assert.match(fluxo, /concluirEnvio\(\);\s*setAvisoReceita\(false\);\s*window\.open\(href, "_blank"\)/);
});
