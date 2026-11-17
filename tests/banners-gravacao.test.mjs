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

test("termo de busca do banner: valida, troca e apaga sem mexer em outras vagas", async () => {
  const { validarBusca, gravarBusca } = await import("../app/banners-gravacao.ts");
  assert.deepEqual(validarBusca({ id: "hero-3", busca: "  Personal   Baby " }), { ok: true, id: "hero-3", busca: "Personal Baby" });
  assert.equal(validarBusca({ id: "hero-3", busca: "<script>" }).ok, false);
  assert.equal(validarBusca({ id: "hero-3", busca: "x".repeat(61) }).ok, false);
  assert.equal(validarBusca({ id: "Hero 3", busca: "eno" }).ok, false);
  assert.deepEqual(validarBusca({ id: "hero-3", busca: "" }), { ok: true, id: "hero-3", busca: "" });
  const termos = (db, id) => db.sqlite.prepare("SELECT source FROM metric_hits WHERE stage = 'banner-busca' AND intent = ? ORDER BY id").all(id).map((r) => r.source);
  for (const comBatch of [true, false]) {
    const db = bancoFalso({ comBatch });
    await gravarBanner(db, "hero-3", "data:image/png;base64,ARTE");
    await gravarBusca(db, "hero-3", "fralda");
    await gravarBusca(db, "hero-1", "Decongex");
    await gravarBusca(db, "hero-3", "Personal Baby");
    assert.deepEqual(termos(db, "hero-3"), ["Personal Baby"]);
    assert.deepEqual(termos(db, "hero-1"), ["Decongex"]);
    await gravarBusca(db, "hero-3", "");
    assert.deepEqual(termos(db, "hero-3"), []);
    assert.deepEqual(artes(db, "hero-3"), ["data:image/png;base64,ARTE"]);
  }
});

test("destino do banner: termo do painel, depois produto, depois termo padrão da arte, depois catálogo", async () => {
  const { destinoBanner, buscaPadraoDaArte, BUSCA_PADRAO_POR_ARTE } = await import("../app/shop/painel-banners.ts");
  const arteFralda = "/banners-949x239/WhatsApp_Image_2026-11-16_at_09.32.49_2_banner.jpg";
  assert.equal(buscaPadraoDaArte(arteFralda), "Personal Baby");
  assert.deepEqual(destinoBanner({ url: arteFralda }), { href: "/nacoes-unidas/produtos?q=Personal%20Baby", rotulo: "Ver produtos: Personal Baby" });
  assert.equal(destinoBanner({ url: arteFralda, slug: "cimegripe-gts" }).href, "/nacoes-unidas/produtos/cimegripe-gts");
  assert.equal(destinoBanner({ url: arteFralda, slug: "cimegripe-gts", busca: "Fralda Personal" }).href, "/nacoes-unidas/produtos?q=Fralda%20Personal");
  assert.equal(destinoBanner({ url: "data:image/jpeg;base64,AAA" }).href, "/nacoes-unidas/produtos");
  // Toda arte com termo padrão existe de verdade em public/.
  const { existsSync } = await import("node:fs");
  for (const arquivo of Object.keys(BUSCA_PADRAO_POR_ARTE)) assert.ok(existsSync(new URL(`../public/banners-949x239/${arquivo}`, import.meta.url)), arquivo);
});
