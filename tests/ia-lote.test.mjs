import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const E = await import("../app/ia-lote-elegiveis.ts");
const F = await import("../app/ia-fila.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

const item = (nome, categoria = "Cuidado Diário", extra = {}) => ({ nome, categoria, isMIP: false, preco: 10, ...extra });
const base = (extra = {}) => ({ itens: [], restritos: [], jaTratadas: new Set(), comDescricaoPainel: new Set(), temFoto: () => true, ...extra });

test("lote: escolhe só produto sem descrição, sem medicamento, NBCAL nem fórmula, e com foto primeiro", () => {
  const itens = [
    item("SH XPTO NOVO 400ML"),
    item("DIPIRONA 500MG", "Medicamentos"),
    item("LAXANTE X", "Cuidado Diário", { isMIP: true }),
    item("BICO MAMADEIRA ABC"),
    item("SABONETE XPTO 90G"),
    item("PRODUTO SEM PRECO", "Beleza", { preco: 0 }),
    item("RECEITADO Z 10MG"),
    item("JA TRATADO Y"),
  ];
  const r = E.elegiveis(base({ itens, restritos: ["RECEITADO Z 10MG"], jaTratadas: new Set(["JA TRATADO Y"]), temFoto: (n) => n.startsWith("SABONETE") }));
  assert.equal(r[0], "SABONETE XPTO 90G", "com foto primeiro");
  assert.ok(r.includes("SH XPTO NOVO 400ML"));
  for (const fora of ["DIPIRONA 500MG", "LAXANTE X", "PRODUTO SEM PRECO", "RECEITADO Z 10MG", "JA TRATADO Y"]) assert.ok(!r.includes(fora), fora);
  assert.ok(!r.includes("BICO MAMADEIRA ABC"), "NBCAL fica de fora");
});

test("fila: guarda, lista só pendentes, descarta e não repete produto tratado", async () => {
  const linhas = new Map();
  const db = {
    async exec() {},
    prepare(sql) {
      return {
        bind(...v) {
          return {
            async run() {
              if (sql.startsWith("INSERT OR REPLACE")) linhas.set(v[0], { chave: v[0], original: v[1], descricao: v[2], marca: v[3], estado: v[4], criado: v[5] });
              if (sql.startsWith("UPDATE")) { const l = linhas.get(v[1]); if (l) l.estado = v[0]; }
            },
            async all() {
              if (sql.includes("WHERE estado")) return { results: [...linhas.values()].filter((l) => l.estado === v[0]) };
              return { results: [...linhas.values()].map((l) => ({ chave: l.chave })) };
            },
            async first() { return null; },
          };
        },
      };
    },
  };
  await F.guardarSugestao(db, "SH XPTO 400ML", "Shampoo Xpto de 400 ml.", "Xpto", "pendente");
  await F.guardarSugestao(db, "SAB XPTO 90G", "", "", "sem_sugestao");
  assert.equal((await F.pendentes(db)).length, 1);
  assert.equal((await F.chavesJaTratadas(db)).size, 2);
  await F.decidir(db, "SH XPTO 400ML", "descartada");
  assert.equal((await F.pendentes(db)).length, 0);
  assert.equal((await F.chavesJaTratadas(db)).size, 2, "descartada continua tratada");
});

test("lote e fila: só equipe, nada vai ao cliente sem aprovação, e o painel salva pelo fluxo com histórico", async () => {
  const mw = await ler("middleware.ts");
  assert.match(mw, /pathname\.startsWith\("\/api\/interno\/"\)/);
  const lote = await ler("app/api/interno/ia/lote/route.ts");
  assert.ok(!/definirDescricao|dispararSincronizacao/.test(lote), "o lote nunca publica");
  assert.match(lote, /"pendente"/);
  const fila = await ler("app/components/FilaIA.tsx");
  assert.match(fila, /\/api\/interno\/produto\/descricao/);
  assert.match(fila, /Aprovar/);
  assert.match(fila, /Descartar/);
  const painel = await ler("app/components/PainelFotos.tsx");
  assert.match(painel, /<FilaIA /);
});
