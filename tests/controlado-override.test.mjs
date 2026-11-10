import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const C = await import("../app/controlado-override.ts");

test("controlado override: validação dos 3 estados e chave", () => {
  assert.equal(C.chaveDoNome("  Alprazolam  1mg "), "ALPRAZOLAM 1MG");
  assert.deepEqual(C.validarEstado("auto"), { ok: true, estado: "auto" });
  assert.deepEqual(C.validarEstado("sim"), { ok: true, estado: "sim" });
  assert.deepEqual(C.validarEstado("nao"), { ok: true, estado: "nao" });
  assert.equal(C.validarEstado("talvez").erro, "estado_invalido");
  assert.equal(C.ehCategoriaComControlado("Medicamentos"), true);
  assert.equal(C.ehCategoriaComControlado("Bem Estar"), false);
  assert.equal(C.ehCategoriaComControlado("Beleza"), false);
});

test("controlado override: grava sim/não, volta ao automático e registra quem/quando", async () => {
  const t = { produto_controlado: [], produto_alteracao_log: [] };
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT OR REPLACE INTO produto_controlado/.test(sql)) {
            const [chave, original, estado, por, quando] = v;
            t.produto_controlado = t.produto_controlado.filter((l) => l.chave !== chave).concat({ chave, original, estado, por, quando });
          } else if (/^DELETE FROM produto_controlado/.test(sql)) t.produto_controlado = t.produto_controlado.filter((l) => l.chave !== v[0]);
          else if (/^INSERT INTO produto_alteracao_log/.test(sql)) {
            t.produto_alteracao_log.push({ tipo: v[0], titulo: v[2], acao: v[3], anterior: v[4], novo: v[5], por: v[6], quando: v[7] });
          }
        },
        first: async () => t.produto_controlado.find((l) => l.chave === v[0]) ?? null,
        all: async () => ({ results: t.produto_controlado }),
      }),
    }),
  };
  await C.definirControlado(db, "DIPIRONA 1G", "sim", "Maria", new Date("2026-11-09T12:00:00Z"));
  assert.deepEqual(await C.mapaDeControlados(db), { "DIPIRONA 1G": { estado: "sim", por: "Maria", quando: "2026-11-09T12:00:00.000Z" } });
  await C.definirControlado(db, "DIPIRONA 1G", "nao", "João", new Date("2026-11-09T13:00:00Z"));
  assert.equal((await C.mapaDeControlados(db))["DIPIRONA 1G"].estado, "nao");
  await C.definirControlado(db, "DIPIRONA 1G", "auto", "Ana", new Date("2026-11-09T14:00:00Z"));
  assert.deepEqual(await C.mapaDeControlados(db), {});
  assert.equal(t.produto_alteracao_log.length, 3);
  assert.equal(t.produto_alteracao_log[0].tipo, "controlado");
  assert.equal(t.produto_alteracao_log[2].novo, "auto");
});

test("controlado override: painel, API, sync e middleware ligados", async () => {
  const [painel, api, sync, mid, fotos, aprov] = await Promise.all([
    readFile(new URL("../app/components/PainelFotos.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interno/produto/controlado/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../ops/catalogo-nacoes/sincronizar.py", import.meta.url), "utf8"),
    readFile(new URL("../middleware.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/interno/fotos/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/catalogo-aprovacoes/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(painel, />Controlado<\/span>/);
  assert.match(painel, /categoriaEfetiva\(l\) === "Medicamentos"/);
  assert.match(painel, /\/api\/interno\/produto\/controlado/);
  assert.match(api, /definirControlado/);
  assert.match(api, /so_medicamentos/);
  assert.match(api, /ehCategoriaComControlado/);
  assert.match(sync, /controlados-overrides\.json/);
  assert.match(sync, /aplicar_controlado\.py/);
  assert.match(mid, /\/api\/interno\/produto\/controlado/);
  assert.match(fotos, /controlados/);
  assert.match(aprov, /controlados/);
  const ovr = JSON.parse(await readFile(new URL("../app/nacoes-unidas/produtos/dados/controlados-overrides.json", import.meta.url), "utf8"));
  assert.equal(typeof ovr, "object");
});
