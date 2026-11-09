import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const C = await import("../app/categoria-override.ts");

test("categoria override: validação e categorias públicas", () => {
  assert.equal(C.chaveDoNome("  Pao de Mel "), "PAO DE MEL");
  assert.deepEqual(C.validarCategoria("auto"), { ok: true, estado: "auto" });
  assert.deepEqual(C.validarCategoria("Bem Estar"), { ok: true, estado: "Bem Estar" });
  assert.deepEqual(C.validarCategoria("Medicamentos"), { ok: true, estado: "Medicamentos" });
  assert.equal(C.validarCategoria("Categoria a conferir").erro, "categoria_invalida");
  assert.ok(C.CATEGORIAS_VALIDAS.includes("Cuidado Diário"));
  assert.ok(C.CATEGORIAS_VALIDAS.includes("Infantil e Gestante"));
});

test("categoria override: grava, limpa e registra histórico", async () => {
  const t = { produto_categoria: [], produto_alteracao_log: [] };
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT OR REPLACE INTO produto_categoria/.test(sql)) {
            const [chave, original, categoria, por, quando] = v;
            t.produto_categoria = t.produto_categoria.filter((l) => l.chave !== chave).concat({ chave, original, categoria, por, quando });
          } else if (/^DELETE FROM produto_categoria/.test(sql)) t.produto_categoria = t.produto_categoria.filter((l) => l.chave !== v[0]);
          else if (/^INSERT INTO produto_alteracao_log/.test(sql)) {
            t.produto_alteracao_log.push({ tipo: v[0], titulo: v[2], acao: v[3], anterior: v[4], novo: v[5], por: v[6], quando: v[7] });
          }
        },
        first: async () => t.produto_categoria.find((l) => l.chave === v[0]) ?? null,
        all: async () => ({ results: t.produto_categoria }),
      }),
    }),
  };
  await C.definirCategoria(db, "PAO DE MEL", "Bem Estar", "Maria", new Date("2026-11-09T12:00:00Z"));
  assert.equal((await C.mapaDeCategorias(db))["PAO DE MEL"].categoria, "Bem Estar");
  await C.definirCategoria(db, "PAO DE MEL", "auto", "João", new Date("2026-11-09T13:00:00Z"));
  assert.deepEqual(await C.mapaDeCategorias(db), {});
  assert.equal(t.produto_alteracao_log[0].tipo, "categoria");
});

test("categoria override: painel, API, sync, workflow e middleware", async () => {
  const [painel, api, sync, mid, wf, fotos, aprov] = await Promise.all([
    readFile(new URL("../app/components/PainelFotos.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interno/produto/categoria/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../ops/catalogo-nacoes/sincronizar.py", import.meta.url), "utf8"),
    readFile(new URL("../middleware.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/catalogo-sync.yml", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interno/fotos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/catalogo-aprovacoes/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(painel, /salvarCategoria/);
  assert.match(painel, /categoriaEfetiva/);
  assert.match(painel, /CATEGORIAS_VALIDAS/);
  assert.match(api, /sistema_restrito/);
  assert.match(api, /definirControlado/);
  assert.match(sync, /categorias-overrides\.json/);
  assert.match(sync, /aplicar_categoria\.py/);
  assert.match(mid, /\/api\/interno\/produto\/categoria/);
  assert.match(wf, /categorias-overrides\.json/);
  assert.match(fotos, /categoriasOverride/);
  assert.match(aprov, /categorias/);
  const ovr = JSON.parse(await readFile(new URL("../app/nacoes-unidas/produtos/dados/categorias-overrides.json", import.meta.url), "utf8"));
  assert.equal(typeof ovr, "object");
});
