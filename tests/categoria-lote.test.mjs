import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("mover vários produtos de categoria: rota protegida, com a regra de receita/controlado e uma só publicação", async () => {
  const [rota, middleware, painel] = await Promise.all([
    ler("app/api/interno/produto/categoria/lote/route.ts"),
    ler("middleware.ts"),
    ler("app/components/PainelFotos.tsx"),
  ]);
  // Só equipe logada: a rota precisa estar nas duas listas do middleware (sem cookie, redireciona para a entrada).
  assert.equal(middleware.split("/api/interno/produto/categoria/lote").length - 1, 2);
  // Mesma regra do produto a produto: receita e controlado do sistema não saem de Medicamentos.
  assert.match(rota, /sistemaReceitaOuControlado\(original\)/);
  assert.match(rota, /bloqueados\.push\(original\)/);
  // Ao sair de Medicamentos limpa o enquadramento controlado e só dispara uma publicação, depois do laço.
  assert.match(rota, /definirControlado\(db, original, "auto", quem\)/);
  assert.equal(rota.split("dispararSincronizacao(db)").length - 1, 1);
  assert.ok(rota.indexOf("dispararSincronizacao(db)") > rota.indexOf("for (const original of originais)"));
  assert.match(rota, /MAX_ITENS = 300/);
  // O painel usa a rota e mostra quantos ficaram de fora.
  assert.match(painel, /\/api\/interno\/produto\/categoria\/lote/);
  assert.match(painel, /ficaram de fora por serem receita ou controlado/);
});
