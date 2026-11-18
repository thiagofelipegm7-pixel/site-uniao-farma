import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  consultarCep,
  formatarCep,
  formatarTaxaCentavos,
  soDigitosCep,
  taxaOficialDoBairro,
  validarCepParaCotar,
} from "../app/area-entrega.ts";
import { UNITS } from "../app/site-config.ts";

const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");

const nacoes = UNITS.find((u) => u.id === "nacoes");
const taxa = (bairro) => nacoes.deliveryFees[bairro];

function atendida(cep, bairros, bairroTaxa) {
  const area = consultarCep(cep);
  assert.equal(area.status, "atendida", cep);
  assert.deepEqual(area.bairros, bairros);
  assert.equal(area.taxaCentavos, taxa(bairroTaxa));
}

function fora(cep) {
  assert.equal(consultarCep(cep).status, "fora", cep);
}

test("normaliza CEP com hífen, espaço, colado e incompleto", () => {
  assert.equal(soDigitosCep("34590-010"), "34590010");
  assert.equal(soDigitosCep("34590 010"), "34590010");
  assert.equal(soDigitosCep(" 34590010 "), "34590010");
  assert.equal(soDigitosCep("34590-010\n"), "34590010");
  assert.equal(soDigitosCep("CEP 34.590-010"), "34590010");
  assert.equal(formatarCep("34590010"), "34590-010");
  assert.equal(formatarCep("34590-010"), "34590-010");
  assert.equal(formatarCep("34590 010"), "34590-010");
  assert.equal(formatarCep("34590"), "34590");
  assert.equal(formatarCep("3459"), "3459");
  assert.equal(formatarCep(""), "");
  assert.equal(consultarCep("").status, "vazio");
  assert.deepEqual(consultarCep("34590"), { status: "incompleto", digitos: "34590" });
  assert.deepEqual(consultarCep("34590-01"), { status: "incompleto", digitos: "3459001" });
  assert.deepEqual(consultarCep(" 345 90 "), { status: "incompleto", digitos: "34590" });
});

test("Nações Unidas: limites da faixa e CEP isolado 34590-400", () => {
  atendida("34590-000", ["Nações Unidas"], "Nações Unidas");
  atendida("34590-010", ["Nações Unidas"], "Nações Unidas");
  atendida("34590-390", ["Nações Unidas"], "Nações Unidas");
  fora("34590-391");
  fora("34590-399");
  atendida("34590-400", ["Nações Unidas"], "Nações Unidas");
  fora("34590-401");
  assert.equal(consultarCep("34590010").taxaCentavos, 100);
});

test("Itacolomi / Vila Rica / Vila São José: limites e CEPs isolados, taxa única de R$2", () => {
  const grupo = ["Itacolomi", "Vila Rica", "Vila São José"];
  fora("34580-009");
  atendida("34580-010", grupo, "Itacolomi");
  atendida("34580-200", grupo, "Itacolomi");
  fora("34580-201");
  fora("34580-219");
  atendida("34580-220", grupo, "Itacolomi");
  fora("34580-221");
  fora("34580-239");
  atendida("34580-240", grupo, "Itacolomi");
  atendida("34580-680", grupo, "Itacolomi");
  fora("34580-681");
  fora("34580-699");
  atendida("34585-000", grupo, "Itacolomi");
  atendida("34585-022", grupo, "Itacolomi");
  fora("34585-023");
  fora("34585-039");
  atendida("34585-040", grupo, "Itacolomi");
  atendida("34585-300", grupo, "Itacolomi");
  fora("34585-301");
  atendida("34515-370", grupo, "Itacolomi");
  atendida("34515-380", grupo, "Itacolomi");
  fora("34515-369");
  fora("34515-371");
  fora("34515-379");
  fora("34515-381");
  assert.equal(consultarCep("34580-010").taxaCentavos, 200);
  assert.equal(consultarCep("34515-370").taxaCentavos, taxa("Vila São José"));
});

test("Valparaíso: limites da faixa e CEP isolado 34585-580", () => {
  fora("34585-469");
  atendida("34585-470", ["Valparaíso"], "Valparaíso");
  atendida("34585-560", ["Valparaíso"], "Valparaíso");
  fora("34585-561");
  fora("34585-579");
  atendida("34585-580", ["Valparaíso"], "Valparaíso");
  fora("34585-581");
  assert.equal(consultarCep("34585-470").taxaCentavos, 300);
});

test("Coqueiros: limites das faixas e CEPs isolados", () => {
  fora("34575-119");
  atendida("34575-120", ["Coqueiros"], "Coqueiros");
  fora("34575-121");
  fora("34575-249");
  atendida("34575-250", ["Coqueiros"], "Coqueiros");
  atendida("34575-260", ["Coqueiros"], "Coqueiros");
  fora("34575-261");
  atendida("34575-300", ["Coqueiros"], "Coqueiros");
  fora("34575-301");
  fora("34575-319");
  atendida("34575-320", ["Coqueiros"], "Coqueiros");
  atendida("34575-360", ["Coqueiros"], "Coqueiros");
  fora("34575-361");
  atendida("34575-390", ["Coqueiros"], "Coqueiros");
  fora("34575-391");
  fora("34576-000");
  atendida("34576-001", ["Coqueiros"], "Coqueiros");
  atendida("34576-090", ["Coqueiros"], "Coqueiros");
  fora("34576-091");
  assert.equal(consultarCep("34575-120").taxaCentavos, 400);
});

test("General Carneiro e Ipê Amarelo: faixa compartilhada pede confirmação e não escolhe a taxa sozinha", () => {
  fora("34580-699");
  const inicio = consultarCep("34580-700");
  const fim = consultarCep("34580-770");
  assert.equal(inicio.status, "ambigua");
  assert.deepEqual(inicio.bairros, ["General Carneiro", "Ipê Amarelo"]);
  assert.equal(inicio.taxasCentavos["General Carneiro"], 200);
  assert.equal(inicio.taxasCentavos["Ipê Amarelo"], 500);
  assert.equal(fim.status, "ambigua");
  assert.deepEqual(fim.taxasCentavos, inicio.taxasCentavos);
  fora("34580-771");

  const semEscolha = validarCepParaCotar("34580-700");
  assert.equal(semEscolha.ok, false);
  assert.equal(semEscolha.erro, "bairro_ambiguo");
  assert.match(semEscolha.mensagem, /General Carneiro e Ipê Amarelo/);

  const carneiro = validarCepParaCotar("34580700", "General Carneiro");
  assert.equal(carneiro.ok, true);
  assert.equal(carneiro.bairro, "General Carneiro");
  assert.equal(carneiro.taxaCentavos, 200);

  const ipe = validarCepParaCotar("34580-770", "Ipê Amarelo");
  assert.equal(ipe.ok, true);
  assert.equal(ipe.bairro, "Ipê Amarelo");
  assert.equal(ipe.taxaCentavos, 500);

  const invalido = validarCepParaCotar("34580-700", "Nações Unidas");
  assert.equal(invalido.ok, false);
  assert.equal(invalido.erro, "bairro_ambiguo");
});

test("Conjunto Residencial São José (34515-320) fica fora, com o rótulo confirmar", () => {
  const area = consultarCep("34515-320");
  assert.deepEqual(area, { status: "confirmar", local: "Conjunto Residencial São José" });
  assert.equal(consultarCep("34515320").status, "confirmar");
  const recusa = validarCepParaCotar("34515-320");
  assert.equal(recusa.ok, false);
  assert.equal(recusa.erro, "fora_da_area");
  assert.match(recusa.mensagem, /Conjunto Residencial São José/);
  assert.match(recusa.mensagem, /fora da área/);
});

test("CEP fora da área é recusado com clareza, inclusive incompleto na cotação", () => {
  fora("30130-000");
  fora("34600-380");
  fora("00000-000");
  const recusa = validarCepParaCotar("30130-000");
  assert.equal(recusa.ok, false);
  assert.equal(recusa.erro, "fora_da_area");
  assert.equal(recusa.mensagem, "Este CEP fica fora da área de entrega.");
  assert.equal(recusa.statusHttp, 422);

  const incompleto = validarCepParaCotar("34590");
  assert.equal(incompleto.ok, false);
  assert.equal(incompleto.erro, "cep_invalido");
  assert.equal(incompleto.statusHttp, 400);

  const vazio = validarCepParaCotar("   ");
  assert.equal(vazio.ok, false);
  assert.equal(vazio.erro, "cep_invalido");
});

test("as taxas da área são as mesmas de site-config, sem valor inventado", () => {
  assert.deepEqual(nacoes.deliveryFees, {
    "Nações Unidas": 100,
    "General Carneiro": 200,
    "Vila Rica": 200,
    Itacolomi: 200,
    Coqueiros: 400,
    "Ipê Amarelo": 500,
    Valparaíso: 300,
    "Vila São José": 200,
  });
  for (const bairro of Object.keys(nacoes.deliveryFees)) {
    assert.equal(taxaOficialDoBairro(bairro), nacoes.deliveryFees[bairro]);
  }
  assert.equal(taxaOficialDoBairro("Bairro Inventado"), null);
  assert.equal(formatarTaxaCentavos(100), "R$\u00a01,00");
  assert.equal(formatarTaxaCentavos(500), "R$\u00a05,00");
});

test("painel interno mostra o CEP, pede o bairro na faixa compartilhada e bloqueia cotação fora da área", async () => {
  const [painel, css, rota] = await Promise.all([
    read("app/components/PainelEntregas.tsx"),
    read("app/components/entregas.css"),
    read("app/api/interno/entregas/route.ts"),
  ]);
  assert.match(painel, /consultarCep|validarCepParaCotar|formatarCep/);
  assert.match(painel, /CEP do cliente/);
  assert.match(painel, /bairroConfirmado/);
  assert.match(painel, /General Carneiro/);
  assert.match(painel, /Ipê Amarelo/);
  assert.match(painel, /fora da área/i);
  assert.match(painel, /Fora da área — confirmar/);
  assert.match(painel, /area\.local/);
  assert.match(painel, /ver no mapa/);
  assert.match(css, /entregas-area/);
  assert.match(rota, /validarCepParaCotar/);
  assert.match(rota, /bairroConfirmado/);
  assert.doesNotMatch(rota, /LALAMOVE_API_KEY|UBER_DIRECT_CLIENT_SECRET/);
  const modulo = await read("app/area-entrega.ts");
  assert.match(modulo, /Conjunto Residencial São José/);
  assert.match(modulo, /34515320/);
});
