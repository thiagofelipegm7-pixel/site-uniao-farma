import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mapaDeRemovidos, removerProduto, restaurarProduto } from "../app/produtos-removidos.ts";

/** Banco falso mínimo: guarda só a tabela de removidos e o log. */
function bancoFalso() {
  const removidos = new Map();
  const log = [];
  return {
    removidos,
    log,
    async exec() {},
    prepare(sql) {
      return {
        bind: (...v) => ({
          async run() {
            if (sql.startsWith("INSERT OR REPLACE INTO produto_removido")) removidos.set(v[0], { chave: v[0], original: v[1], por: v[2], quando: v[3] });
            else if (sql.startsWith("DELETE FROM produto_removido")) removidos.delete(v[0]);
            else if (sql.startsWith("INSERT INTO produto_alteracao_log")) log.push({ acao: v[3], por: v[6] });
          },
          async all() {
            return { results: [...removidos.values()] };
          },
          async first() {
            return removidos.get(v[0]) ?? null;
          },
        }),
      };
    },
  };
}

test("excluir produto: guarda pelo nome do sistema, registra quem e restaura", async () => {
  const db = bancoFalso();
  await removerProduto(db, "Pão de   Mel", "Thiago");
  await removerProduto(db, "Pão de Mel", "Thiago"); // repetir não duplica
  const mapa = await mapaDeRemovidos(db);
  assert.deepEqual(Object.keys(mapa), ["PAO DE MEL"]);
  assert.equal(mapa["PAO DE MEL"].por, "Thiago");
  await restaurarProduto(db, "pao de mel", "Thiago");
  assert.deepEqual(Object.keys(await mapaDeRemovidos(db)), []);
  assert.deepEqual(db.log.map((l) => l.acao), ["excluiu o produto do site", "excluiu o produto do site", "devolveu o produto ao site"]);
});

test("excluir produto: só equipe logada, sem senha no código, e a sincronização aplica a exclusão", async () => {
  const [mw, rota, painel, feed, sync] = await Promise.all([
    readFile(new URL("../middleware.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interno/produto/excluir/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PainelFotos.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/catalogo-aprovacoes/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../ops/catalogo-nacoes/sincronizar.py", import.meta.url), "utf8"),
  ]);
  // a rota pede a senha da equipe no middleware (antes ficava aberta, protegida só por uma senha fixa)
  assert.equal((mw.match(/\/api\/interno\/produto\/excluir/g) ?? []).length, 2);
  assert.doesNotMatch(rota + painel, /senha\s*!==\s*"uniao"|"uniao"/);
  assert.match(painel, /Sim, excluir/);
  assert.match(painel, /alertdialog/);
  assert.match(feed, /removidos/);
  assert.match(sync, /aplicar_removidos\.py/);
  assert.match(sync, /produtos-removidos\.json/);
});
