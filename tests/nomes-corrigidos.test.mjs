import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const N = await import("../app/nomes-corrigidos.ts");

test("nome corrigido: regras de validação e chave sem acento", () => {
  assert.equal(N.chaveDoNome("  Dipirona   1g Ção "), "DIPIRONA 1G CAO");
  assert.deepEqual(N.validarNome("  Pincel   para tintura grande "), { ok: true, nome: "Pincel para tintura grande" });
  assert.equal(N.validarNome("ab").erro, "tamanho");
  assert.equal(N.validarNome("x".repeat(121)).erro, "tamanho");
  assert.equal(N.validarNome("Pincel <b>grande</b>").erro, "caracteres");
  assert.equal(N.validarNome("PINCEL PARA TINTURA GRANDE").erro, "tudo_maiusculo");
  assert.equal(N.validarNome("Soro SF 0,9% 500ml").ok, true, "sigla no meio é normal");
  assert.equal(N.validarNome(42).erro, "tamanho");
});

test("nome corrigido: histórico guarda quem, quando e o nome anterior; desfazer volta ao automático", async () => {
  const t = { produto_nome: [], produto_alteracao_log: [] };
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT OR REPLACE INTO produto_nome/.test(sql)) {
            const [chave, original, nome, por, quando] = v;
            t.produto_nome = t.produto_nome.filter((l) => l.chave !== chave).concat({ chave, original, nome, por, quando });
          } else if (/^DELETE FROM produto_nome/.test(sql)) t.produto_nome = t.produto_nome.filter((l) => l.chave !== v[0]);
          else if (/^INSERT INTO produto_alteracao_log/.test(sql)) t.produto_alteracao_log.push({ tipo: v[0], titulo: v[2], acao: v[3], anterior: v[4], novo: v[5], por: v[6], quando: v[7] });
        },
        first: async () => t.produto_nome.find((l) => l.chave === v[0]) ?? null,
        all: async () => (/produto_alteracao_log/.test(sql) ? { results: [...t.produto_alteracao_log].reverse() } : { results: t.produto_nome }),
      }),
    }),
  };
  await N.corrigirNome(db, "PINCEL P/ TINTURA GRANDE", "Pincel para tintura grande", "Maria", new Date("2026-11-08T12:00:00Z"));
  await N.corrigirNome(db, "PINCEL P/ TINTURA GRANDE", "Pincel de tintura (grande)", "João", new Date("2026-11-08T13:00:00Z"));
  const mapa = await N.mapaDeNomes(db);
  assert.deepEqual(mapa["PINCEL P/ TINTURA GRANDE"], { nome: "Pincel de tintura (grande)", por: "João", quando: "2026-11-08T13:00:00.000Z" });
  const log = await N.ultimasAlteracoes(db);
  assert.equal(log[0].anterior, "Pincel para tintura grande", "o log guarda o nome anterior");
  assert.equal(log[0].por, "João");
  assert.equal(await N.desfazerNome(db, "PINCEL P/ TINTURA GRANDE", "Ana"), true);
  assert.deepEqual(await N.mapaDeNomes(db), {});
  assert.equal(await N.desfazerNome(db, "PINCEL P/ TINTURA GRANDE", "Ana"), false);
  assert.equal(t.produto_alteracao_log.length, 3);
});

test("nome corrigido: o site e o gerador da busca leem o mesmo arquivo e a sincronização o publica", async () => {
  const [exibicao, assets, fluxo, sync] = await Promise.all([
    readFile(new URL("../app/nome-exibicao.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/gerar-assets-catalogo.mjs", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/catalogo-sync.yml", import.meta.url), "utf8"),
    readFile(new URL("../ops/catalogo-nacoes/sincronizar.py", import.meta.url), "utf8"),
  ]);
  assert.match(exibicao, /nomes-corrigidos\.json/);
  assert.match(assets, /nomes-corrigidos\.json/);
  assert.match(fluxo, /nomes-corrigidos\.json/);
  assert.match(sync, /nomes-corrigidos\.json/);
  const base = JSON.parse(await readFile(new URL("../app/nacoes-unidas/produtos/dados/nomes-corrigidos.json", import.meta.url), "utf8"));
  assert.equal(typeof base, "object");
  const { nomeDeExibicao } = await import("../app/nome-exibicao.ts");
  assert.equal(nomeDeExibicao("DES ROLL ON NIVEA PROTECT 50ML"), "Desodorante roll-on Nivea Protect 50ml", "sem correção, vale a regra automática");
});
