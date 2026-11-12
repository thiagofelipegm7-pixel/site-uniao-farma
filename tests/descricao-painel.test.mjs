import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const D = await import("../app/descricao-override.ts");
const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("descrição escrita no painel: validação (tamanho, promessa de efeito, HTML, fonte https)", () => {
  const ok = "Pente de cabelo de plástico, com dentes largos, 18 cm de comprimento.";
  assert.deepEqual(D.validarDescricao(ok, ""), { ok: true, texto: ok, fonte: null });
  assert.deepEqual(D.validarDescricao(ok, "https://www.marca.com.br/pente"), { ok: true, texto: ok, fonte: "https://www.marca.com.br/pente" });
  assert.deepEqual(D.validarDescricao("", ""), { ok: true, texto: null, fonte: null });
  assert.deepEqual(D.validarDescricao(null, null), { ok: true, texto: null, fonte: null });
  assert.equal(D.validarDescricao("curto demais", "").erro, "tamanho");
  assert.equal(D.validarDescricao("x".repeat(601), "").erro, "tamanho");
  assert.equal(D.validarDescricao(`${ok} <b>`, "").erro, "caracteres");
  for (const t of ["Creme que cura as rachaduras dos pés e protege a pele.", "Desodorante com proteção de 48 horas contra o suor.", "Hidratante clinicamente comprovado para pele seca!", "Shampoo por R$ 10,00 para cabelos secos e normais."]) {
    assert.equal(D.validarDescricao(t, "").erro, "promessa", t);
  }
  assert.equal(D.validarDescricao(ok, "http://marca.com.br").erro, "fonte");
  assert.equal(D.validarDescricao(ok, "isto não é link").erro, "fonte");
});

test("descrição escrita no painel: grava, volta ao automático e registra histórico", async () => {
  const t = { produto_descricao: [], produto_alteracao_log: [] };
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT OR REPLACE INTO produto_descricao/.test(sql)) {
            const [chave, original, texto, fonte, por, quando] = v;
            t.produto_descricao = t.produto_descricao.filter((l) => l.chave !== chave).concat({ chave, original, texto, fonte, por, quando });
          } else if (/^DELETE FROM produto_descricao/.test(sql)) t.produto_descricao = t.produto_descricao.filter((l) => l.chave !== v[0]);
          else if (/^INSERT INTO produto_alteracao_log/.test(sql)) t.produto_alteracao_log.push({ tipo: v[0], acao: v[3], anterior: v[4], novo: v[5] });
        },
        first: async () => t.produto_descricao.find((l) => l.chave === v[0]) ?? null,
        all: async () => ({ results: t.produto_descricao }),
      }),
    }),
  };
  await D.definirDescricao(db, "Pente Diverso", "Pente de plástico com dentes largos.", null, "Maria");
  await D.definirDescricao(db, "Pente Diverso", "Pente de plástico com dentes largos, 18 cm.", "https://marca.com.br", "João");
  assert.equal((await D.mapaDeDescricoes(db))["PENTE DIVERSO"].fonte, "https://marca.com.br");
  await D.definirDescricao(db, "Pente Diverso", null, null, "João");
  assert.deepEqual(await D.mapaDeDescricoes(db), {});
  assert.deepEqual(t.produto_alteracao_log.map((l) => l.acao), ["escreveu a descrição", "alterou a descrição", "voltou a descrição ao automático"]);
});

test("descrição escrita no painel: protegida por login, sem medicamento, vale mais que pesquisa e IA, chega pela sincronização", async () => {
  const [middleware, rota, descricoes, sync, flow, aprov, painel] = await Promise.all([
    ler("middleware.ts"),
    ler("app/api/interno/produto/descricao/route.ts"),
    ler("app/nacoes-unidas/produtos/descricoes.ts"),
    ler("ops/catalogo-nacoes/sincronizar.py"),
    ler(".github/workflows/catalogo-sync.yml"),
    ler("app/api/catalogo-aprovacoes/route.ts"),
    ler("app/components/PainelFotos.tsx"),
  ]);
  assert.equal(middleware.split("/api/interno/produto/descricao").length - 1, 2, "nas duas listas protegidas");
  assert.match(rota, /item\.isMIP \|\| item\.categoria === "Medicamentos"/);
  assert.match(rota, /ehNbcal\(original\) \|\| ehFormulaInfantil\(original\)/);
  const corpo = descricoes.slice(descricoes.indexOf("export function descricaoDoProduto"));
  assert.ok(corpo.indexOf("PAINEL.get(slug)") < corpo.indexOf("PESQUISA[slug]"), "a da equipe vem antes da pesquisa");
  assert.match(sync, /descricoes-painel\.json/);
  assert.match(flow, /descricoes-painel\.json/);
  assert.match(aprov, /mapaDeDescricoes/);
  assert.match(painel, /\/api\/interno\/produto\/descricao/);
  const preenchidas = JSON.parse(await ler("app/nacoes-unidas/produtos/dados/descricoes-painel.json"));
  for (const [chave, v] of Object.entries(preenchidas)) assert.equal(D.validarDescricao(v.t, v.fonte ?? "").ok, true, chave);
});

test("descrição escrita no painel: a chave do nome do sistema vira o mesmo endereço da página", async () => {
  const { slugify } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
  for (const nome of ["PO DESCOLORANTE LIGHTNER 20G", "Cetaphil locao Hidratante Corporal 453g", "COND PALM 350ML HIALURONICO(E)*", "SH DOVE MAN CARE 200ML"]) {
    assert.equal(slugify(D.chaveDoNome(nome)), slugify(nome), nome);
  }
});
