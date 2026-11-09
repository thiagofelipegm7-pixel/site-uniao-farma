import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canPublishOffer,
  canUseInAds,
  formatOfferDate,
  getOffersKicker,
  getOffersReviewDate,
  getPublicOffers,
  isOfferExpired,
  isOffersCatalogFresh,
  lojaDaOferta,
  lojaParaReserva,
  OFFERS,
  OFFERS_FRESH_DAYS,
  precoAnteriorConfirmado,
  precoOfertaCentavos,
  selecionarOfertasSemana,
} from "../app/offers.ts";

const baseOffer = {
  id: "test-offer",
  slug: "test-offer",
  name: "Oferta de teste",
  category: "cuidados_pessoais",
  currentPrice: 19.9,
  previousPrice: null,
  previousPriceConfirmed: false,
  image: "/approved-test-image.webp",
  imageApproved: true,
  priceConfirmed: true,
  validityConfirmed: false,
  validityType: "date",
  units: ["fatima"],
  availability: "consult",
  regulatoryClass: "non_regulated",
  publicationStatus: "approved",
  promotionConfirmed: true,
  adsEligible: true,
  updatedAt: "2026-08-16",
};

test("publishes only a complete, approved and current offer", () => {
  assert.deepEqual(canPublishOffer(baseOffer, new Date("2026-08-16T12:00:00-03:00")), {
    publishable: true,
    code: "approved",
    reason: "Oferta apta para publicação.",
  });

  const blockers = [
    [{ ...baseOffer, publicationStatus: "draft" }, "status_not_approved"],
    [{ ...baseOffer, currentPrice: null }, "price_missing"],
    [{ ...baseOffer, imageApproved: false }, "image_not_approved"],
    [{ ...baseOffer, image: undefined }, "image_missing"],
    [{ ...baseOffer, promotionConfirmed: false }, "promotion_not_confirmed"],
    [{ ...baseOffer, units: [] }, "units_missing"],
    [{ ...baseOffer, regulatoryClass: "prescription_blocked" }, "prescription_blocked"],
    [
      { ...baseOffer, regulatoryClass: "supplement_review", manualRegulatoryApproval: false },
      "regulatory_approval_missing",
    ],
  ];

  for (const [offer, code] of blockers) {
    assert.equal(canPublishOffer(offer, new Date("2026-08-16T12:00:00-03:00")).code, code);
  }
});

test("expires an offer automatically after validUntil without extending it", () => {
  const expiring = { ...baseOffer, validUntil: "2026-08-16" };
  assert.equal(isOfferExpired(expiring, new Date("2026-08-16T23:59:00-03:00")), false);
  assert.equal(isOfferExpired(expiring, new Date("2026-08-17T00:00:00-03:00")), true);
  assert.equal(canPublishOffer(expiring, new Date("2026-08-17T00:00:00-03:00")).code, "expired");
});

test("keeps site publication separate from Google Ads eligibility", () => {
  assert.equal(canUseInAds(baseOffer).eligible, false);
  assert.equal(
    canUseInAds(
      { ...baseOffer, validityConfirmed: true, validityType: "date", validUntil: "2026-08-30", adsEligible: true },
      new Date("2026-08-16T12:00:00-03:00"),
    ).eligible,
    true,
  );
  assert.equal(
    canUseInAds(
      { ...baseOffer, validityConfirmed: true, validityType: "while_stock_lasts", validUntil: undefined, adsEligible: true },
      new Date("2026-08-16T12:00:00-03:00"),
    ).eligible,
    true,
  );
});

test("publishes confirmed promotions while keeping incomplete and blocked items out", () => {
  assert.equal(OFFERS.length, 21);
  assert.equal(getPublicOffers(new Date("2026-08-16T12:00:00-03:00")).length, 11);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "approved").length, 11);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "draft").length, 0);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "review").length, 6);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "blocked").length, 4);
  assert.equal(OFFERS.find((offer) => offer.id === "tandrilax")?.regulatoryClass, "prescription_blocked");
  const commercialOffers = OFFERS.filter((offer) => offer.publicationStatus === "approved");
  assert.equal(commercialOffers.length, 11);
  assert.deepEqual(
    commercialOffers.map((offer) => offer.name),
    [
      "Cerave pote creme hidratante sem perfume 85g",
      "Kit protetor solar Sunless FPS50 toque seco 200g + 120g",
      "Creme Seda para pentear 300 ml",
      "Loção hidratante Nivea 400 ml",
      "Creme Seda Boom 1 kg",
      "Protetor solar Sundown 200 ml",
      "Fralda Hipopó pacote hiper",
      "Lenço umedecido Natural Baby",
      "Roupa íntima geriátrica Comfort Master",
      "Fralda geriátrica Salute",
      "Fralda IsaBaby",
    ],
  );
  assert.ok(commercialOffers.every((offer) => offer.priceConfirmed));
  assert.ok(commercialOffers.every((offer) => offer.image));
  assert.ok(commercialOffers.every((offer) => offer.validityConfirmed));
  assert.ok(commercialOffers.every((offer) => offer.validityType === "while_stock_lasts"));
  assert.ok(commercialOffers.every((offer) => offer.validUntil === undefined));
  // Suplemento fica de fora dos anúncios pagos até a revisão do responsável técnico; as demais podem anunciar.
  const anunciaveis = commercialOffers.filter((offer) => offer.regulatoryClass !== "supplement_review");
  assert.ok(anunciaveis.every((offer) => offer.adsEligible));
  assert.ok(anunciaveis.every((offer) => canUseInAds(offer).eligible));
  assert.ok(OFFERS.filter((offer) => offer.publicationStatus !== "approved").every((offer) => !offer.adsEligible));
  assert.equal(OFFERS.filter((offer) => offer.imageApproved).length, 11);
  assert.ok(OFFERS.some((offer) => offer.currentPrice !== null));
  assert.equal(getPublicOffers().some((offer) => offer.id === "tandrilax"), false);
});

test("offers kicker and review date come from the catalog data", () => {
  const offers = [
    { ...baseOffer, id: "a", updatedAt: "2026-08-10" },
    { ...baseOffer, id: "b", updatedAt: "2026-08-17" },
    { ...baseOffer, id: "c", updatedAt: "2026-08-12" },
  ];
  assert.equal(OFFERS_FRESH_DAYS, 10);
  assert.equal(getOffersReviewDate(offers), "2026-08-17");
  assert.equal(getOffersReviewDate([]), null);
  assert.equal(formatOfferDate("2026-08-17"), "17/08/2026");

  const fresh = new Date("2026-08-27T12:00:00-03:00");
  const stale = new Date("2026-08-28T12:00:00-03:00");
  assert.equal(isOffersCatalogFresh(fresh, offers), true);
  assert.equal(isOffersCatalogFresh(stale, offers), false);
  assert.equal(isOffersCatalogFresh(fresh, []), false);
  assert.equal(getOffersKicker(fresh, offers), "Ofertas da semana");
  assert.equal(getOffersKicker(stale, offers), "Ofertas");
  assert.equal(getOffersKicker(fresh, []), "Ofertas");

  const published = getPublicOffers();
  assert.equal(getOffersReviewDate(), getOffersReviewDate(published));
});

test("painel da semana: no máximo 3 ofertas, sem receita, e De só com preço anterior confirmado", () => {
  const publicas = getPublicOffers(new Date("2026-08-17T12:00:00-03:00"));
  const semana = selecionarOfertasSemana(publicas);
  assert.ok(semana.length >= 1);
  assert.ok(semana.length <= 3);
  assert.equal(semana.length, 3);
  assert.ok(semana.every((offer) => offer.regulatoryClass !== "prescription_blocked"));
  // As 2 primeiras vêm das artes da loja, com De/Por confirmados pelo dono; a terceira não tem "De" confirmado e não mostra riscado.
  assert.deepEqual(semana.map((offer) => precoAnteriorConfirmado(offer)), [59.9, 79.9, null]);
  assert.ok(semana.every((offer) => precoAnteriorConfirmado(offer) === null || offer.currentPrice < precoAnteriorConfirmado(offer)));
  assert.deepEqual(semana.map((offer) => offer.name), publicas.slice(0, 3).map((offer) => offer.name));

  const comDe = { ...baseOffer, previousPrice: 45, previousPriceConfirmed: true, currentPrice: 39 };
  assert.equal(precoAnteriorConfirmado(comDe), 45);
  assert.equal(precoAnteriorConfirmado({ ...comDe, previousPriceConfirmed: false }), null);
  assert.equal(precoAnteriorConfirmado({ ...comDe, previousPrice: null }), null);
  assert.equal(precoAnteriorConfirmado({ ...comDe, previousPrice: 10 }), null);
  assert.equal(precoOfertaCentavos(13.9), 1390);
  assert.equal(precoOfertaCentavos(29), 2900);

  const bloqueada = { ...baseOffer, id: "caneta", regulatoryClass: "prescription_blocked", currentPrice: 99 };
  const extras = [0, 1, 2, 3].map((i) => ({ ...baseOffer, id: `extra-${i}` }));
  const escolhidas = selecionarOfertasSemana([bloqueada, ...extras]);
  assert.equal(escolhidas.length, 3);
  assert.ok(escolhidas.every((offer) => offer.id !== "caneta"));
  assert.equal(lojaDaOferta(baseOffer), "fatima");
  assert.equal(lojaDaOferta({ ...baseOffer, units: [] }), null);
});

test("componente OfertasSemana: estrutura, no máximo 3, sem De inventado; home não monta o painel", async () => {
  const read = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");
  const [painel, home, ofertas] = await Promise.all([
    read("app/OfertasSemana.tsx"),
    read("app/HomePage.tsx"),
    read("app/offers.ts"),
  ]);
  // Pedido da loja: tirar o painel da home (página /ofertas e dados permanecem).
  assert.doesNotMatch(home, /<OfertasSemana/);
  assert.doesNotMatch(home, /ofertas-da-semana/);
  assert.match(painel, /OFERTAS DA SEMANA/);
  assert.match(painel, /Ofertas válidas enquanto durar o estoque em cada loja\./);
  // O painel do protótipo não tem "Ver todas as ofertas"; /ofertas continua no cabeçalho.
  assert.doesNotMatch(painel, /Ver todas as ofertas/);
  assert.match(painel, /ReservarBotao/);
  assert.match(painel, /source="ofertas_semana"/);
  assert.match(painel, /precoAnteriorConfirmado/);
  assert.match(painel, /selecionarOfertasSemana/);
  assert.doesNotMatch(painel, /De R\$ \d/);
  assert.match(ofertas, /previousPrice \(número maior que currentPrice\)/);
  // Nenhum "De" sem confirmação: todo previousPrice numérico tem previousPriceConfirmed: true.
  assert.equal((ofertas.match(/^\s+previousPrice: \d/gm) ?? []).length, (ofertas.match(/^\s+previousPriceConfirmed: true,/gm) ?? []).length);
});

test("reserva da oferta vai para a loja preferida do cliente quando a oferta vale nela", () => {
  const todas = { units: ["fatima", "nacoes", "itacolomi"] };
  assert.equal(lojaParaReserva(todas, "itacolomi"), "itacolomi");
  assert.equal(lojaParaReserva(todas, null), "fatima");
  assert.equal(lojaParaReserva({ units: ["nacoes"] }, "itacolomi"), "nacoes");
  assert.equal(lojaParaReserva({ units: [] }, "itacolomi"), null);
});
