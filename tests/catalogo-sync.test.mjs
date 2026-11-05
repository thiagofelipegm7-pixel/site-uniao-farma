import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("sincronização do catálogo: validações da origem e da saída (python)", () => {
  const r = spawnSync("python3", ["-m", "unittest", "test_sincronizar"], { cwd: "ops/catalogo-nacoes", encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("workflow catalogo-sync: cron depois do PC, token só por secret, sem permissões além de contents", () => {
  const y = readFileSync(".github/workflows/catalogo-sync.yml", "utf8");
  assert.match(y, /cron: "15 11,14,17,20,23 \* \* \*"/);
  assert.match(y, /CATALOGO_READ_TOKEN: \$\{\{ secrets\.CATALOGO_READ_TOKEN \}\}/);
  assert.match(y, /permissions:\n  contents: write/);
  assert.match(y, /concurrency:/);
  assert.doesNotMatch(y, /eyJ|Bearer [A-Za-z0-9]{10,}/);
});

test("sincronizar.py nunca grava estoque nem código de barras no que é público", () => {
  const py = readFileSync("ops/catalogo-nacoes/sincronizar.py", "utf8");
  assert.match(py, /CAMPOS_PROIBIDOS/);
  assert.match(py, /Estoque/);
  assert.match(py, /CodigoDeBarras/);
});
