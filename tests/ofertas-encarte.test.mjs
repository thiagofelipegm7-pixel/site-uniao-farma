import assert from "node:assert/strict";
import test from "node:test";
import {
  ENCARTES_VALIDO_ATE,
  ENCARTES_VALIDO_DE,
  OFERTAS_HOME,
  ofertaHomeVigente,
  periodoOfertaAberto,
  precoPorOfertaVigente,
  textoLevePor,
} from "../app/shop/ofertas-config.ts";
import { promocoesQuantidadeEncarteVigentes } from "../app/promocao-quantidade-encarte.ts";

const noDia = new Date("2026-11-27T12:00:00-03:00");
const vespera = new Date("2026-11-26T23:59:00-03:00");
const depois = new Date("2026-11-28T00:00:00-03:00");

test("o encarte de Black Friday vale só no dia 27/11, no horário de Brasília", () => {
  assert.equal(ENCARTES_VALIDO_DE, "2026-11-27");
  assert.equal(ENCARTES_VALIDO_ATE, "2026-11-27");
  assert.equal(periodoOfertaAberto(ENCARTES_VALIDO_DE, ENCARTES_VALIDO_ATE, noDia), true);
  assert.equal(periodoOfertaAberto(ENCARTES_VALIDO_DE, ENCARTES_VALIDO_ATE, vespera), false);
  assert.equal(periodoOfertaAberto(ENCARTES_VALIDO_DE, ENCARTES_VALIDO_ATE, depois), false);
  assert.equal(periodoOfertaAberto(ENCARTES_VALIDO_DE, ENCARTES_VALIDO_ATE, new Date("2026-11-27T23:59:00-03:00")), true);
});

test("Elseve usa o de 49,90 do DMaster e o por 29,90 do encarte", () => {
  const elseve = OFERTAS_HOME.find((item) => item.nomeCatalogo === "OLEO ELSEVE EXTRAORDINARIO 100ML");
  assert.ok(elseve);
  assert.equal(elseve.precoAnteriorCentavos, 4990);
  assert.equal(elseve.precoPorCentavos, 2990);
  assert.equal(precoPorOfertaVigente(elseve.nomeCatalogo, noDia), 2990);
  assert.equal(precoPorOfertaVigente(elseve.nomeCatalogo, depois), null);
  assert.equal(ofertaHomeVigente(elseve.nomeCatalogo, vespera), null);
});

test("o leve 3 do encarte também some depois do dia 27/11", () => {
  assert.equal(promocoesQuantidadeEncarteVigentes(noDia).length, 4);
  assert.equal(promocoesQuantidadeEncarteVigentes(depois).length, 0);
  assert.ok(promocoesQuantidadeEncarteVigentes(noDia).some((item) => item.slug === "narix-0-5mg-fr-30ml-adulto"));
  assert.ok(promocoesQuantidadeEncarteVigentes(noDia).every((item) => item.faixas[0].quantidade === 3));
});

test("os medicamentos com receita do encarte entram na vitrine, com o leve 3 sóbrio e sem a Losartana Neo Química", () => {
  const flexalgin = OFERTAS_HOME.find((item) => item.nomeCatalogo === "FLEXALGIN CX 30CPR");
  const nimesulida = OFERTAS_HOME.find((item) => item.nomeCatalogo === "NIMESULIDA 100mg cx 12cpr GLOBO PHARMA");
  const losartanaTeuto = OFERTAS_HOME.find((item) => item.nomeCatalogo === "LOSARTANA 50mg cx 30cpr TEUTO");
  const strepsilsMel = OFERTAS_HOME.find((item) => item.nomeCatalogo === "STREPSILS 875MG CX 16 PAST MEL LIMAO");
  const nevralgex = OFERTAS_HOME.find((item) => item.nomeCatalogo === "NEVRALGEX CARTELA 10 CP");
  const narix = OFERTAS_HOME.find((item) => item.nomeCatalogo === "NARIX 0.5mg fr 30ML ADULTO");
  assert.ok(flexalgin && nimesulida && losartanaTeuto && strepsilsMel && nevralgex && narix);
  assert.equal(flexalgin.precoPorCentavos, 990);
  assert.equal(strepsilsMel.precoPorCentavos, 1990);
  assert.equal(nimesulida.precoPorCentavos, undefined);
  assert.equal(nimesulida.leveQuantidade, 3);
  assert.equal(nimesulida.levePrecoCentavos, 999);
  assert.equal(precoPorOfertaVigente(nimesulida.nomeCatalogo, noDia), null);
  assert.equal(textoLevePor(3, 999), "Leve 3 por R$ 9,99");
  assert.equal(textoLevePor(3, 894), "Leve 3 por R$ 8,94");
  assert.equal(OFERTAS_HOME.some((item) => /LOSARTANA/i.test(item.nomeCatalogo) && /NEO QUIMICA/i.test(item.nomeCatalogo)), false);

});
