import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const F = await import("../app/fotos-painel.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const ctx = (extra = {}) => ({ marca: "Condor", nomeCorrigido: false, temDescricao: false, ...extra });
const linha = (extra = {}) => ({ nome: "PENTE DE CABELO", categoria: "Cuidado Diário", semCodigo: false, ...extra });

test("pendências do painel: nome suspeito pega resto de cadastro, não nome normal", () => {
  for (const n of ["COND PALM 350ML HIALURONICO(E)*", "AFOLIMAX 30ML (ACIDO FOLICO) /", "KIT DERMAFEME 200ML &", "ENCAPSULADO COLAGENO\\"]) assert.equal(F.nomeSuspeito(n), true, n);
  for (const n of ["DOVE SABONETE 90G", "SH SEDA 300ML", "PARACETAMOL 750MG CX 20"]) assert.equal(F.nomeSuspeito(n), false, n);
});

test("pendências do painel: cada filtro enxerga só o que falta", () => {
  assert.equal(F.temPendencia(linha(), "semmarca", ctx({ marca: "" })), true);
  assert.equal(F.temPendencia(linha(), "semmarca", ctx({ marca: "  " })), true);
  assert.equal(F.temPendencia(linha(), "semmarca", ctx()), false);
  assert.equal(F.temPendencia(linha({ semCodigo: true }), "semcodigo", ctx()), true);
  assert.equal(F.temPendencia(linha(), "semcodigo", ctx()), false);
  assert.equal(F.temPendencia(linha(), "semdescricao", ctx()), true);
  assert.equal(F.temPendencia(linha(), "semdescricao", ctx({ temDescricao: true })), false);
  // Medicamento tem texto neutro de propósito e item fora do site nem aparece: não entram em "sem descrição".
  assert.equal(F.temPendencia(linha({ categoria: "Medicamentos" }), "semdescricao", ctx()), false);
  assert.equal(F.temPendencia(linha({ categoria: F.SEM_CATEGORIA }), "semdescricao", ctx()), false);
  // Nome já corrigido no painel deixa de ser suspeito.
  assert.equal(F.temPendencia(linha({ nome: "COND PALM(E)*" }), "nomerevisar", ctx()), true);
  assert.equal(F.temPendencia(linha({ nome: "COND PALM(E)*" }), "nomerevisar", ctx({ nomeCorrigido: true })), false);
  assert.equal(F.temPendencia(linha(), "", ctx()), true);
});

test("pendências do painel: a rota entrega quem já tem descrição e a tela mostra a contagem de cada pendência", async () => {
  const [rota, painel] = await Promise.all([ler("app/api/interno/fotos/route.ts"), ler("app/components/PainelFotos.tsx")]);
  assert.match(rota, /comDescricao/);
  assert.match(rota, /d\.origem !== "modelo"/);
  assert.match(painel, /aria-label="Pendências"/);
  assert.match(painel, /ROTULOS_PENDENCIA\[p\]\} \(\{contagemPendencias\[p\]/);
});
