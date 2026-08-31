import assert from "node:assert/strict";
import test from "node:test";
import { canPublishOffer, canUseInAds, getPublicOffers, isOfferExpired, OFFERS } from "../app/offers.ts";

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
    canUseInAds({ ...baseOffer, validityConfirmed: true, validityType: "date", validUntil: "2026-08-30", adsEligible: true }).eligible,
    true,
  );
  assert.equal(
    canUseInAds({ ...baseOffer, validityConfirmed: true, validityType: "while_stock_lasts", validUntil: undefined, adsEligible: true }).eligible,
    true,
  );
});

test("publishes confirmed promotions while keeping incomplete and blocked items out", () => {
  assert.equal(OFFERS.length, 19);
  assert.equal(getPublicOffers(new Date("2026-08-16T12:00:00-03:00")).length, 9);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "approved").length, 9);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "draft").length, 0);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "review").length, 6);
  assert.equal(OFFERS.filter((offer) => offer.publicationStatus === "blocked").length, 4);
  assert.equal(OFFERS.find((offer) => offer.id === "tandrilax")?.regulatoryClass, "prescription_blocked");
  const commercialOffers = OFFERS.filter((offer) => offer.publicationStatus === "approved");
  assert.equal(commercialOffers.length, 9);
  assert.deepEqual(
    commercialOffers.map((offer) => offer.name),
    [
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
  assert.ok(commercialOffers.every((offer) => offer.adsEligible));
  assert.ok(commercialOffers.every((offer) => canUseInAds(offer).eligible));
  assert.ok(OFFERS.filter((offer) => offer.publicationStatus !== "approved").every((offer) => !offer.adsEligible));
  assert.equal(OFFERS.filter((offer) => offer.imageApproved).length, 9);
  assert.ok(OFFERS.some((offer) => offer.currentPrice !== null));
  assert.equal(getPublicOffers().some((offer) => offer.id === "tandrilax"), false);
});
