import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const S = await import("../app/sinonimos-ia.ts");
const PB = await import("../app/palavras-busca.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

const vocab = new Set(["fio", "dental", "preservativo", "creme", "tinta", "shampoo"]);
const contar = (alt) => ({ "fio dental": 6, "preservativo": 12, "creme dental": 0, "tinta": 200, "creme": 79 })[alt] ?? 0;

test("sinônimos da IA: só palavras da lista, diferentes do termo, com 1 a 60 produtos e no máximo 3", () => {
  const termos = ["fita dental", "camisinha", "rimel", "tinta de cabelo", "pasta de dente", "shampo"];
  const m = S.lerSinonimos(
    JSON.stringify({ itens: [
      { i: 1, alternativas: ["Fio Dental", "fio dental", "fita dental"] },
      { i: 2, alternativas: ["preservativo", "jontex"] },
      { i: 3, alternativas: ["maquiagem", "delineador"] },
      { i: 4, alternativas: ["tinta"] },
      { i: 5, alternativas: ["creme dental"] },
      { i: 99, alternativas: ["creme"] },
    ] }),
    termos, vocab, contar,
  );
  assert.deepEqual(m.get(1), [{ t: "fio dental", n: 6 }]);
  assert.deepEqual(m.get(2), [{ t: "preservativo", n: 12 }]);
  assert.deepEqual(m.get(3), [], "palavra fora da lista");
  assert.deepEqual(m.get(4), [], "genérica demais (200 produtos)");
  assert.deepEqual(m.get(5), [], "sem produto");
  assert.equal(m.has(6), false, "a IA não respondeu este");
  assert.equal(m.has(99), false);
  assert.equal(S.lerSinonimos("lixo", termos, vocab, contar).size, 0);
});

test("sinônimo aprovado vira palavra de busca dos produtos: acrescenta sem perder as que já existiam e respeita o teto", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return { bind: (...v) => ({
        async first() { return linhas.get(v[0]) ?? null; },
        async all() { return { results: [...linhas.values()] }; },
        async run() { if (sql.startsWith("INSERT OR REPLACE INTO produto_palavras")) linhas.set(v[0], { chave: v[0], original: v[1], palavras: v[2], fonte: v[3] }); },
      }) };
    },
  };
  await PB.definirPalavras(db, "FIO DENTAL X", ["fio dental"], "ia", "gemini");
  assert.equal(await PB.acrescentarPalavra(db, "FIO DENTAL X", "fita dental", "Ana"), true);
  assert.equal(linhas.get("FIO DENTAL X").palavras, "fio dental, fita dental");
  assert.equal(linhas.get("FIO DENTAL X").fonte, "equipe");
  assert.equal(await PB.acrescentarPalavra(db, "FIO DENTAL X", "fita dental", "Ana"), false, "não repete");
  assert.equal(await PB.acrescentarPalavra(db, "SEM NADA", "fita dental", "Ana"), true);
  for (let i = 0; i < 20; i++) await PB.acrescentarPalavra(db, "CHEIO", `termo${"abcdefghijklmnopqrstu"[i]}`, "Ana");
  assert.equal(linhas.get("CHEIO").palavras.split(",").length, PB.MAX_PALAVRAS_COM_SINONIMOS);
});

test("rotas de sinônimos: só equipe, remédio fora, a IA só propõe e a aprovação passa pelas palavras de busca com histórico", async () => {
  const [gerar, decidir, servidor, painel, mw] = await Promise.all([
    ler("app/api/interno/ia/sinonimos/route.ts"), ler("app/api/interno/ia/sinonimos/decidir/route.ts"), ler("app/sinonimos-ia-servidor.ts"),
    ler("app/components/BuscasSemResultado.tsx"), ler("middleware.ts"),
  ]);
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
  assert.ok(!/acrescentarPalavra|definirPalavras/.test(gerar), "gerar nunca muda a busca");
  assert.match(gerar, /produtosDaAlternativa\(itens, alt\)/);
  assert.match(decidir, /acrescentarPalavra\(db, nome, termo, quem\)/);
  assert.match(decidir, /sug\.estado !== "pendente"/);
  assert.match(decidir, /sug\.alternativas\.some\(\(a\) => a\.t === alternativa\)/);
  assert.match(servidor, /i\.isMIP \|\| i\.categoria === "Medicamentos" \|\| restritos\.has\(k\)/);
  assert.match(painel, /Sugerir sinônimos com IA/);
  assert.match(painel, /Remédios nunca entram/);
});
