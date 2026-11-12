import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const M = await import("../app/marca-override.ts");
const lerTexto = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("marca preenchida no painel: validação", () => {
  assert.deepEqual(M.validarMarca("  Fixodent  "), { ok: true, marca: "Fixodent" });
  assert.deepEqual(M.validarMarca(""), { ok: true, marca: null });
  assert.deepEqual(M.validarMarca(null), { ok: true, marca: null });
  assert.equal(M.validarMarca("A").erro, "marca_invalida");
  assert.equal(M.validarMarca("<b>x</b>").erro, "marca_invalida");
  assert.equal(M.validarMarca("x".repeat(61)).erro, "marca_invalida");
});

test("marca preenchida no painel: grava, volta ao automático e registra histórico", async () => {
  const t = { produto_marca: [], produto_alteracao_log: [] };
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT OR REPLACE INTO produto_marca/.test(sql)) {
            const [chave, original, marca, por, quando] = v;
            t.produto_marca = t.produto_marca.filter((l) => l.chave !== chave).concat({ chave, original, marca, por, quando });
          } else if (/^DELETE FROM produto_marca/.test(sql)) t.produto_marca = t.produto_marca.filter((l) => l.chave !== v[0]);
          else if (/^INSERT INTO produto_alteracao_log/.test(sql)) t.produto_alteracao_log.push({ tipo: v[0], acao: v[3], anterior: v[4], novo: v[5], por: v[6] });
        },
        first: async () => t.produto_marca.find((l) => l.chave === v[0]) ?? null,
        all: async () => ({ results: t.produto_marca }),
      }),
    }),
  };
  await M.definirMarca(db, "Pente Diverso", "Condor", "Maria");
  assert.equal((await M.mapaDeMarcas(db))["PENTE DIVERSO"].marca, "Condor");
  await M.definirMarca(db, "Pente Diverso", "Marisa", "João");
  await M.definirMarca(db, "Pente Diverso", null, "João");
  assert.deepEqual(await M.mapaDeMarcas(db), {});
  assert.deepEqual(t.produto_alteracao_log.map((l) => [l.tipo, l.anterior, l.novo]), [["marca", null, "Condor"], ["marca", "Condor", "Marisa"], ["marca", "Marisa", null]]);
});

test("marca preenchida no painel: vale mais que o laboratório do sistema e chega ao site pela sincronização", async () => {
  const { marcaDoItem } = await import("../app/nacoes-unidas/produtos/marca.ts");
  assert.equal(marcaDoItem("FIXODENT 68 G", "HALEON"), "HALEON");
  const [sync, aprov, flow, gerador, painel] = await Promise.all([
    lerTexto("ops/catalogo-nacoes/sincronizar.py"),
    lerTexto("app/api/catalogo-aprovacoes/route.ts"),
    lerTexto(".github/workflows/catalogo-sync.yml"),
    lerTexto("scripts/gerar-assets-catalogo.mjs"),
    lerTexto("app/components/PainelFotos.tsx"),
  ]);
  assert.match(sync, /marcas-corrigidas\.json/);
  assert.match(aprov, /mapaDeMarcas/);
  assert.match(flow, /marcas-corrigidas\.json/);
  assert.match(gerador, /marcas-corrigidas\.json/);
  assert.match(painel, /\/api\/interno\/produto\/marca/);
  assert.deepEqual(JSON.parse(await lerTexto("app/nacoes-unidas/produtos/dados/marcas-corrigidas.json")), {});
  // A rota só pode ser chamada por quem está logado: precisa estar nas duas listas do middleware.
  assert.equal((await lerTexto("middleware.ts")).split("/api/interno/produto/marca").length - 1, 2);
});
