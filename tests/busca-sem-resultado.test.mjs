import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const B = await import("../app/busca-sem-resultado.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("registro de busca: guarda só texto comum normalizado; descarta saúde sensível, dado pessoal e endereço", () => {
  assert.equal(B.termoParaRegistro("  Shampoo ANTICASPA!! "), "shampoo anticaspa");
  assert.equal(B.termoParaRegistro("Lâmina de Barbear"), "lamina de barbear");
  for (const ruim of ["pilula do dia seguinte", "teste de gravidez", "hiv", "antidepressivo depressao", "fulano@gmail.com", "https://x.com", "11999998888", "meu cpf 12345678901", "ab", "x".repeat(70), "a b c d e f g", "12345"]) {
    assert.equal(B.termoParaRegistro(ruim), null, ruim);
  }
  assert.equal(B.termoParaRegistro(42), null);
  assert.equal(B.resultadoValido("vazia"), "vazia");
  assert.equal(B.resultadoValido("parcial"), "parcial");
  assert.equal(B.resultadoValido("qualquer"), null);
});

test("registro de busca: conta por dia e resultado e lista primeiro o que ficou vazio", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return { bind: (...v) => ({
        async run() { if (sql.startsWith("INSERT")) { const k = v.slice(0, 3).join("|"); linhas.set(k, (linhas.get(k) ?? 0) + 1); } },
        async all() {
          const por = new Map();
          for (const [k, n] of linhas) { const [termo, dia, r] = k.split("|"); const x = por.get(termo) ?? { termo, total: 0, vazia: 0, ultimo: dia }; x.total += n; if (r === "vazia") x.vazia += n; por.set(termo, x); }
          return { results: [...por.values()].sort((a, b) => b.vazia - a.vazia || b.total - a.total) };
        },
      }) };
    },
  };
  await B.registrarBusca(db, "rimel", "vazia", "2026-11-14", false);
  await B.registrarBusca(db, "rimel", "vazia", "2026-11-14", false);
  await B.registrarBusca(db, "fraldinha", "corrigida", "2026-11-14", false);
  const t = await B.topBuscas(db, "2026-11-14");
  assert.equal(t[0].termo, "rimel");
  assert.equal(t[0].vazia, 2);
  assert.equal(t[1].vazia, 0);
});

test("rota pública é anônima e a lista é só da equipe; busca manda o termo ao WhatsApp e o site avisa na privacidade", async () => {
  const [rota, interna, lista, mw, priv, listaEquipe] = await Promise.all([
    ler("app/api/busca-sem-resultado/route.ts"), ler("app/api/interno/buscas/route.ts"), ler("app/nacoes-unidas/produtos/CatalogoLista.tsx"),
    ler("middleware.ts"), ler("app/privacidade/page.tsx"), ler("app/components/BuscasSemResultado.tsx"),
  ]);
  assert.ok(!/cf-connecting-ip[\s\S]{0,200}registrarBusca/.test(rota), "o IP não vai para o banco");
  assert.match(rota, /new Response\(null, \{ status: 204 \}\)/);
  assert.match(rota, /termoParaRegistro\(corpo\.q\)/);
  assert.match(interna, /topBuscas\(db/);
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
  assert.match(mw, /"\/api\/busca-sem-resultado"/);
  assert.match(lista, /tolerante\.tipo === "sintoma"/, "busca por sintoma nunca é registrada");
  assert.match(lista, /u\.searchParams\.set\("text"/);
  assert.match(lista, /href=\{whatsappBusca\}/);
  assert.match(priv, /apagamos depois de 90 dias/);
  // A lista da equipe continua no componente; o painel de fotos (PR #514) não a monta mais.
  assert.match(listaEquipe, /export default function BuscasSemResultado/);
});
