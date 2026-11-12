import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { MAX_ARQUIVO_BYTES, MAX_DATA_URL, gravarBanner, mensagemTamanho, validarBanner } from "../app/banners-gravacao.ts";

// D1 de mentira em cima do SQLite do Node: mesma API (prepare/bind/run/batch) e batch numa transação, como no D1.
function bancoFalso({ comBatch = true } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../drizzle/0000_vengeful_eternals.sql", import.meta.url), "utf8").replaceAll("--> statement-breakpoint", ""));
  const prepare = (sql) => {
    const stmt = { args: [], bind: (...v) => ({ ...stmt, args: v }), run: async function () { return sqlite.prepare(sql).run(...this.args); } };
    return stmt;
  };
  const db = { sqlite, prepare };
  if (comBatch) {
    db.batch = async (stmts) => {
      sqlite.exec("BEGIN");
      try {
        for (const s of stmts) await s.run();
        sqlite.exec("COMMIT");
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    };
  }
  return db;
}
const artes = (db, id) => db.sqlite.prepare("SELECT source FROM metric_hits WHERE stage = 'banner' AND intent = ? ORDER BY id").all(id).map((r) => r.source);

test("troca a arte: a nova fica, a antiga sai, outras vagas não mudam", async () => {
  for (const comBatch of [true, false]) {
    const db = bancoFalso({ comBatch });
    await gravarBanner(db, "hero-1", "data:image/png;base64,ANTIGA");
    await gravarBanner(db, "hero-2", "data:image/png;base64,OUTRA");
    await gravarBanner(db, "hero-1", "data:image/png;base64,NOVA");
    assert.deepEqual(artes(db, "hero-1"), ["data:image/png;base64,NOVA"]);
    assert.deepEqual(artes(db, "hero-2"), ["data:image/png;base64,OUTRA"]);
  }
});

test("se gravar a nova falhar, a arte antiga continua no ar", async () => {
  for (const comBatch of [true, false]) {
    const db = bancoFalso({ comBatch });
    await gravarBanner(db, "hero-1", "data:image/png;base64,ANTIGA");
    // Simula o D1 recusando a linha (ex.: maior que 2 MB).
    db.sqlite.exec("CREATE TRIGGER recusa BEFORE INSERT ON metric_hits WHEN NEW.source LIKE '%FALHA%' BEGIN SELECT RAISE(ABORT, 'string or blob too big'); END;");
    await assert.rejects(() => gravarBanner(db, "hero-1", "data:image/png;base64,FALHA"));
    assert.deepEqual(artes(db, "hero-1"), ["data:image/png;base64,ANTIGA"], comBatch ? "com batch" : "sem batch");
  }
});

test("validação: limite de tamanho, vaga e formato", () => {
  const prefixo = "data:image/jpeg;base64,";
  assert.equal(validarBanner({ id: "hero-1", url: prefixo + "A".repeat(10) }).ok, true);
  assert.equal(validarBanner({ id: "hero-1", url: "https://exemplo.com/a.jpg" }).ok, true);
  assert.deepEqual(validarBanner({ id: "hero-1", url: prefixo + "A".repeat(MAX_DATA_URL) }), { ok: false, erro: "arte_grande", status: 413 });
  assert.equal(validarBanner({ id: "hero-1", url: prefixo + "A".repeat(MAX_DATA_URL - prefixo.length) }).ok, true);
  assert.equal(validarBanner({}).ok, false);
  assert.equal(validarBanner({ id: "hero-1" }).ok, false);
  assert.deepEqual(validarBanner({ id: "x'; DROP", url: prefixo + "A" }), { ok: false, erro: "vaga_invalida", status: 400 });
  assert.deepEqual(validarBanner({ id: "hero-1", url: "javascript:alert(1)" }), { ok: false, erro: "formato_invalido", status: 400 });
});

test("o limite do painel cabe no limite do D1 (2.000.000 bytes por linha) depois do base64", () => {
  const dataUrl = "data:image/jpeg;base64,".length + Math.ceil(MAX_ARQUIVO_BYTES / 3) * 4;
  assert.ok(dataUrl <= MAX_DATA_URL, `${dataUrl} > ${MAX_DATA_URL}`);
  assert.ok(MAX_DATA_URL + 500 < 2_000_000);
  assert.match(mensagemTamanho(3_456_789), /3,5 MB e o máximo é 1,3 MB/);
  assert.match(mensagemTamanho(3_456_789), /banner atual não foi alterado/);
});

test("a rota grava pela função segura (sem apagar antes de inserir)", () => {
  const rota = readFileSync(new URL("../app/api/interno/banners/route.ts", import.meta.url), "utf8");
  assert.match(rota, /gravarBanner\(/);
  assert.match(rota, /validarBanner\(/);
  assert.doesNotMatch(rota, /DELETE FROM metric_hits/);
});
