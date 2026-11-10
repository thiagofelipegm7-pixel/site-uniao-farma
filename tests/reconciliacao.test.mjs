import assert from "node:assert/strict";
import test from "node:test";
import { reconciliarContagens } from "../app/fotos-painel.ts";

const it = (Produto, extra = {}) => ({ Produto, CodigoDeBarras: "", Laboratorio: "X", Pvenda: 10, Classe: "", ...extra });

test("as contagens fecham: cada linha do PC cai em uma só conta", () => {
  const itens = [
    it("Produto A", { CodigoDeBarras: "111" }),
    it("Produto A", { CodigoDeBarras: "222" }), // repetido no site (mesmo nome, lab e preço), código diferente
    it("Produto B", { CodigoDeBarras: "333" }),
    it("Produto C", { CodigoDeBarras: "333", Pvenda: 5 }), // código repetido no painel
    it("Brinco prata", { CodigoDeBarras: "444" }), // bijuteria
    it("Taxa de entrega"), // serviço
    it("Aferimento de pressão"), // serviço
    it("Xerox", { Classe: "SERVICOS" }), // serviço
    it("Produto D", { CodigoDeBarras: "555", Pvenda: 0 }), // sem preço: não vai ao site
  ];
  const r = reconciliarContagens(itens, 5);
  assert.equal(r.pc, 9);
  assert.equal(r.servicos, 3);
  assert.equal(r.semPreco, 1);
  assert.equal(r.repetidos, 1);
  assert.equal(r.noSite, 4);
  assert.equal(r.pc, r.servicos + r.semPreco + r.repetidos + r.noSite);
  assert.equal(r.bijuterias, 1);
  assert.equal(r.codigosRepetidos, 1);
  assert.equal(r.noPainel, 4);
  assert.equal(r.semPrecoNoPainel, 1);
  assert.equal(r.aVendaNoPainel, 3);
  assert.equal(r.listadosNoSite, 5);
});
