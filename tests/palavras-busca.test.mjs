import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const P = await import("../app/palavras-busca.ts");
const B = await import("../app/nacoes-unidas/produtos/busca.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("palavras de busca: só nome popular e marca; sem sintoma, número, repetição do nome nem frase longa", () => {
  const r = P.limparPalavras(["Aparelho de Barbear", "lâmina", "Gillette", "alivia dor", "tratamento", "remédio", "12", "prestobarba", "aparelho de barbear", "x", "uma frase muito longa demais aqui", "barbear 3 lâminas"], "PRESTOBARBA 3 SENSITIVE C/2");
  assert.deepEqual(r, ["aparelho de barbear", "lamina", "gillette"]);
  assert.deepEqual(P.limparPalavras("camisinha, preservativo masculino; band aid", "ALGO ZZ"), ["camisinha", "preservativo masculino", "band aid"]);
  assert.equal(P.limparPalavras(Array.from({ length: 20 }, (_, i) => `palavra${"abcdefghijklmnopqrst"[i]}`), "X").length, P.MAX_PALAVRAS);
  assert.deepEqual(P.limparPalavras(null, "X"), []);
});

test("palavras de busca: lê o lote do modelo e ignora índice inventado", () => {
  const nomes = ["PRESTOBARBA 3", "SABONETE X"];
  const m = P.lerLotePalavras('{"itens":[{"i":1,"palavras":["gillette","lamina"]},{"i":2,"palavras":["sabao"]},{"i":9,"palavras":["invento"]},{"i":1,"palavras":["repetido"]}]}', nomes);
  assert.deepEqual([...m.keys()], [1, 2]);
  assert.deepEqual(m.get(1), ["gillette", "lamina"]);
  assert.equal(P.lerLotePalavras("lixo", nomes).size, 0);
});

test("palavras de busca: a equipe vale mais que a IA e a IA nunca sobrescreve a equipe", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return { bind: (...v) => ({
        async first() { return linhas.get(v[0]) ?? null; },
        async all() { return { results: [...linhas.values()] }; },
        async run() { if (sql.startsWith("INSERT OR REPLACE")) linhas.set(v[0], { chave: v[0], original: v[1], palavras: v[2], fonte: v[3] }); if (sql.startsWith("DELETE")) linhas.delete(v[0]); },
      }) };
    },
  };
  assert.equal(await P.definirPalavras(db, "SH XPTO", ["xampu"], "ia", "gemini"), true);
  assert.equal(await P.definirPalavras(db, "SH XPTO", ["shampoo", "xampu"], "equipe", "Ana"), true);
  assert.equal(await P.definirPalavras(db, "SH XPTO", ["outra"], "ia", "gemini"), false, "IA não sobrescreve a equipe");
  assert.equal(linhas.get("SH XPTO").palavras, "shampoo, xampu");
  assert.equal(await P.definirPalavras(db, "SH XPTO", [], "equipe", "Ana"), true);
  assert.equal(linhas.size, 0);
});

test("palavras de busca: a lista de produtos acha pelo jeito popular de falar", () => {
  const grupos = [{ categoria: "Beleza", id: "b", itens: [{ nome: "Prestobarba 3 Sensitive", lab: "BIC", isMIP: false, precoFmt: "R$ 10,00", foto: null, palavras: "aparelho de barbear, lamina" }, { nome: "Sabonete X", lab: "Y", isMIP: false, precoFmt: "R$ 2,00", foto: null }] }];
  const r = B.filtrarGrupos(grupos, "aparelho de barbear");
  assert.deepEqual(r.flatMap((g) => g.itens.map((i) => i.nome)), ["Prestobarba 3 Sensitive"]);
});

test("palavras de busca: seguem o caminho do painel até o site e a rota é só da equipe e nunca dá palavra a remédio", async () => {
  const [aprov, py, wf, gerador, ia, painel, mw] = await Promise.all([
    ler("app/api/catalogo-aprovacoes/route.ts"), ler("ops/catalogo-nacoes/sincronizar.py"), ler(".github/workflows/catalogo-sync.yml"),
    ler("scripts/gerar-assets-catalogo.mjs"), ler("app/api/interno/ia/palavras/route.ts"), ler("app/components/PainelFotos.tsx"), ler("middleware.ts"),
  ]);
  assert.match(aprov, /mapaDePalavras/);
  assert.match(py, /palavras-busca\.json/);
  assert.match(wf, /palavras-busca\.json/);
  assert.match(gerador, /palavrasDe\(item\.nome\)/);
  assert.match(gerador, /\.\.\.\(palavras \? \{ palavras \} : \{\}\)/);
  assert.match(ia, /i\.isMIP \|\| i\.categoria === "Medicamentos" \|\| restritos\.has\(k\)/);
  assert.match(painel, /Palavras de busca/);
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
  assert.equal(JSON.parse(await ler("app/nacoes-unidas/produtos/dados/palavras-busca.json")) instanceof Object, true);
});
