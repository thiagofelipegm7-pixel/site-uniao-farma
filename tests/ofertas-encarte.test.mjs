import assert from "node:assert/strict";
import test from "node:test";
import {
  ENCARTES_VALIDO_ATE,
  ENCARTES_VALIDO_DE,
  OFERTAS_HOME,
  ofertaHomeVigente,
  periodoOfertaAberto,
  precoPorOfertaVigente,
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
