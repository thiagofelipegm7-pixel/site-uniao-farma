import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("área interna: um menu só em todas as telas, e cada item leva a uma tela que existe", async () => {
  const { ITENS_NAV_INTERNO } = await import("../app/interno/itens-nav.ts");
  assert.equal(ITENS_NAV_INTERNO[0].href, "/interno", "o primeiro item é a tela inicial");
  const hrefs = ITENS_NAV_INTERNO.map((i) => i.href);
  assert.equal(new Set(hrefs).size, hrefs.length, "sem item repetido");
  for (const h of hrefs) await access(new URL(`..${h === "/interno" ? "/app/interno" : `/app${h}`}/page.tsx`, import.meta.url), 0);
  const [layout, nav, inicio] = await Promise.all([
    readFile(new URL("../app/interno/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/NavInterna.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/PainelInicio.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /<NavInterna \/>/);
  assert.match(nav, /\/interno\/entrar/, "a tela de entrar não mostra o menu");
  assert.match(nav, /aria-current/, "a tela atual fica marcada");
  assert.match(inicio, /Corrigir um produto/);
  assert.match(inicio, /Atender um pedido/);
  assert.match(inicio, /Alertas/);
});

test("área interna: as telas não repetem mais as suas próprias linhas de links", async () => {
  for (const arq of ["PainelFotos", "PainelRevisao", "PainelErros", "PainelEstoque", "PainelCatalogo"]) {
    const s = await readFile(new URL(`../app/components/${arq}.tsx`, import.meta.url), "utf8");
    assert.doesNotMatch(s, /href="\/interno\/(fotos|revisao|estoque|erros|metricas|catalogo)"/, `${arq} ainda tem links soltos para outras telas internas`);
  }
  const metricas = await readFile(new URL("../app/interno/metricas/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(metricas, /href="\/interno\/catalogo"/);
  const fotos = await readFile(new URL("../app/components/PainelFotos.tsx", import.meta.url), "utf8");
  assert.match(fotos, /get\("q"\)/, "a tela inicial abre a busca de produto já preenchida");
});
