import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("sitemap uses explicit lastUpdated dates instead of Date.now", async () => {
  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /PAGE_LAST_UPDATED/);
  assert.match(sitemap, /sitemapDate/);
  assert.doesNotMatch(sitemap, /const now = new Date\(\)/);
  assert.match(sitemap, /article\.publishedAt/);
});

test("robots.txt does not advertise a non-standard host directive", async () => {
  const robots = await readFile(new URL("../app/robots.ts", import.meta.url), "utf8");
  assert.match(robots, /sitemap:/);
  assert.doesNotMatch(robots, /\bhost:/);
});

test("public pages declare relative canonicals", async () => {
  const files = [
    ["app/page.tsx", 'canonical: "/"'],
    ["app/ofertas/page.tsx", 'canonical: "/ofertas"'],
    ["app/receita/page.tsx", 'canonical: "/receita"'],
    ["app/fatima/page.tsx", 'canonical: "/fatima"'],
    ["app/nacoes-unidas/page.tsx", 'canonical: "/nacoes-unidas"'],
    ["app/itacolomi/page.tsx", 'canonical: "/itacolomi"'],
    ["app/institucional/page.tsx", 'canonical: "/institucional"'],
    ["app/perguntas/page.tsx", 'canonical: "/perguntas"'],
    ["app/encarte/page.tsx", 'canonical: "/encarte"'],
    ["app/farmacia-em-sabara/page.tsx", "canonical: `/${config.slug}`"],
    ["app/farmacia-aberta-domingo-sabara/page.tsx", 'canonical: "/farmacia-aberta-domingo-sabara"'],
    ["app/entrega-de-medicamentos-em-sabara/page.tsx", "canonical: `/${SLUG}`"],
    ["app/perfumaria-em-sabara/page.tsx", "canonical: `/${config.slug}`"],
    ["app/ifood/page.tsx", "canonical: `/${SLUG}`"],
    ["app/jardim-vitoria/page.tsx", "canonical: `/${SLUG}`"],
  ];

  for (const [file, snippet] of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(snippet), file);
    assert.doesNotMatch(source, /canonical: `\$\{SITE_URL\}/);
  }
});

test("only Nações Unidas declares free parking", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  assert.deepEqual(UNITS.filter((u) => u.amenities?.freeParking).map((u) => u.id), ["nacoes"]);
});

test("delivery areas match owner-confirmed list", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  const map = Object.fromEntries(UNITS.map((u) => [u.id, u.deliveryAreas]));
  assert.deepEqual(map, { fatima: ["Nossa Senhora de Fátima", "Jardim Vitória"], nacoes: ["Nações Unidas"], itacolomi: ["Itacolomi"] });
});

test("redirects permanentes apontam para URLs canonicas, sem cadeia e sem sair do sitemap", async () => {
  const config = (await import("../next.config.ts")).default;
  const redirects = await config.redirects();
  const sources = new Set(redirects.map((r) => r.source));
  const canonicalStores = ["/fatima", "/nacoes-unidas", "/itacolomi"];

  for (const r of redirects) {
    assert.equal(r.permanent, true, `${r.source} deve ser redirect permanente`);
    const target = r.destination.split("#")[0];
    assert.ok(!sources.has(target), `${r.source} -> ${r.destination} cai em outro redirect`);
  }
  for (const store of canonicalStores) {
    assert.ok(!sources.has(store), `${store} e canonical e nao pode redirecionar`);
  }
  for (const source of ["/unidades/nossa-senhora-de-fatima", "/unidades/nacoes-unidas", "/unidades/itacolomi"]) {
    assert.ok(sources.has(source), `${source} precisa de redirect permanente`);
  }

  const structured = await readFile(new URL("../app/structured-data.ts", import.meta.url), "utf8");
  for (const store of canonicalStores) {
    assert.ok(structured.includes(`"${store}"`), `${store} deve ser o caminho publico da loja`);
  }
  assert.doesNotMatch(structured, /\/unidades\//);

  const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sitemap, /\/unidades\//);
  for (const source of sources) {
    assert.ok(!sitemap.includes(`SITE_URL}${source}\``), `${source} nao pode estar no sitemap`);
  }
});

test("AEO: cobertura de entrega, Droga Manaus, pagamento e schemas", async () => {
  const { UNITS, getHoursSentence, PAYMENT_ACCEPTED } = await import("../app/site-config.ts");
  const byId = Object.fromEntries(UNITS.map((u) => [u.id, u]));

  assert.equal(byId.fatima.deliveryScope, "em todo o bairro Nossa Senhora de Fátima e no Jardim Vitória");
  assert.equal(byId.nacoes.deliveryScope, "somente no bairro Nações Unidas");
  assert.equal(byId.nacoes.deliveryExclusive, true);
  assert.equal(byId.itacolomi.deliveryScope, "em todo o bairro Itacolomi");
  assert.deepEqual(byId.itacolomi.alternateNames, ["Droga Manaus"]);
  const neighborhood = readFileSync(new URL("../app/NeighborhoodPage.tsx", import.meta.url), "utf8");
  assert.match(neighborhood, /Antiga \{unit\.alternateNames\.join\(", "\)\}/);
  assert.match(readFileSync(new URL("../app/itacolomi/page.tsx", import.meta.url), "utf8"), /description:\s+"Antiga Droga Manaus/);
  assert.equal(byId.fatima.alternateNames, undefined);
  assert.equal(byId.nacoes.alternateNames, undefined);
  assert.match(PAYMENT_ACCEPTED, /Pix/);
  assert.match(getHoursSentence(byId.fatima), /segunda a sexta, das 7h às 21h/);
  assert.match(getHoursSentence(byId.nacoes), /aos domingos, das 8h às 12h/);

  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

  // Schema: alternateName da loja, paymentAccepted e endereço na Organization.
  const structured = read("app/structured-data.ts");
  assert.match(structured, /alternateName: \[COMPANY\.legalName, \.\.\.\(unit\.alternateNames \?\? \[\]\)\]/);
  assert.match(structured, /paymentAccepted: PAYMENT_ACCEPTED/);
  assert.match(structured, /areaServed: unit\.deliveryAreas\.map/);
  const layout = read("app/layout.tsx");
  assert.match(layout, /address: UNITS\.map\(\(unit\) => getPostalAddress\(unit\)\)/);
  assert.match(layout, /paymentAccepted: PAYMENT_ACCEPTED/);

  // /perguntas tem FAQPage com as mesmas perguntas que renderiza; /farmacia-em-sabara tem schema das lojas.
  const perguntas = read("app/perguntas/page.tsx");
  assert.match(perguntas, /faqs: CUSTOMER_QUESTIONS/);
  assert.match(perguntas, /CUSTOMER_QUESTIONS\.map/);
  assert.match(read("app/farmacia-em-sabara/page.tsx"), /includeUnitSchema: true/);
  assert.match(read("app/local-landing-page.tsx"), /units: config\.includeUnitSchema \? UNITS : undefined/);

  // Sem frases genéricas que sugerem entrega fora dos bairros confirmados.
  const forbidden = [
    /Mora em outro bairro\? Chame a loja/,
    /confirma se atende o seu endereço/,
    /confirma se entrega no seu endereço/,
    /Muitas vezes sim/,
    /Depende do bairro e da loja/,
  ];
  for (const file of [
    "app/store-content.ts",
    "app/seo-content.ts",
    "app/NeighborhoodPage.tsx",
    "app/farmacia-aberta-domingo-sabara/page.tsx",
    "app/entrega-de-medicamentos-em-sabara/page.tsx",
    "app/farmacia-em-sabara/page.tsx",
    "app/jardim-vitoria/page.tsx",
  ]) {
    const text = read(file);
    for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `${file} ainda tem ${pattern}`);
  }
});

test("iFood: só a loja Nações Unidas, link exato, rel seguro, evento e sitemap", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  const IFOOD =
    "https://www.ifood.com.br/delivery/sabara-mg/drogaria-uniao-farma-nacoes-unidas/97697e48-2712-4a41-9e59-29eca10d912a";
  const byId = Object.fromEntries(UNITS.map((unit) => [unit.id, unit]));
  assert.equal(byId.nacoes.ifoodUrl, IFOOD);
  assert.equal(byId.fatima.ifoodUrl, undefined);
  assert.equal(byId.itacolomi.ifoodUrl, undefined);

  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const page = read("app/ifood/page.tsx");
  assert.match(page, /target="_blank"/);
  assert.match(page, /rel="noopener noreferrer"/);
  assert.match(page, /data-track-event="ifood_click"/);
  assert.match(page, /data-track-unit=\{nacoes\.id\}/);
  assert.match(page, /Só a loja Nações Unidas está no iFood/);
  assert.doesNotMatch(page, /ifood\.com\.br/, "a URL vem só de site-config");

  // Só a URL do site-config contém o link do iFood no código.
  assert.equal((read("app/site-config.ts").match(/ifood\.com\.br/g) ?? []).length, 1);

  // Evento com store/link_location, sitemap, schema e links internos.
  assert.match(read("app/analytics.ts"), /"ifood_click"/);
  assert.match(read("app/sitemap.ts"), /\/ifood/);
  assert.match(read("app/sitemap-dates.ts"), /ifood:/);
  const structured = read("app/structured-data.ts");
  assert.match(structured, /unit\.ifoodUrl \? \[unit\.ifoodUrl\]/);
  assert.match(structured, /"@type": "OrderAction"/);
  assert.match(read("app/SiteFooter.tsx"), /href: "\/ifood"/);
  assert.match(read("app/NeighborhoodPage.tsx"), /unit\.ifoodUrl \? <a href="\/ifood">/);
  assert.match(read("app/home-sections.tsx"), /<DeliverySlot ifood \/>/);
  assert.match(read("app/entrega-de-medicamentos-em-sabara/page.tsx"), /href="\/ifood"/);
});

test("horário fixo no HTML, /jardim-vitoria, priceRange e FAQ da receita", async () => {
  const { UNITS, getShortHoursPhrase } = await import("../app/site-config.ts");
  const byId = Object.fromEntries(UNITS.map((u) => [u.id, u]));
  assert.equal(getShortHoursPhrase(byId.fatima), "Seg a sex até 21h, sáb até 20h, dom até 12h");
  assert.equal(getShortHoursPhrase(byId.nacoes), "Seg a sex até 21h, sáb até 21h, dom até 12h");
  assert.equal(getShortHoursPhrase(byId.itacolomi), "Seg a sex até 21h, sáb até 20h, dom até 12h");

  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  assert.doesNotMatch(read("app/farmacia-aberta-domingo-sabara/OpenStatusCell.tsx"), /Veja o horário ao lado/);
  assert.match(read("app/farmacia-aberta-domingo-sabara/page.tsx"), /fallback=\{getShortHoursPhrase\(unit\)\}/);
  assert.match(read("app/NeighborhoodPage.tsx"), /getShortHoursPhrase\(unit\)/);

  const page = read("app/jardim-vitoria/page.tsx");
  assert.match(page, /find\(\(unit\) => unit\.id === "fatima"\)/);
  assert.match(page, /units: \[fatima\]/);
  assert.match(read("app/sitemap.ts"), /\/jardim-vitoria/);
  assert.match(read("app/sitemap-dates.ts"), /jardimVitoria:/);
  assert.match(read("app/entrega-de-medicamentos-em-sabara/page.tsx"), /href="\/jardim-vitoria"/);

  assert.match(read("app/structured-data.ts"), /priceRange: "\$\$"/);
  assert.match(read("app/receita/page.tsx"), /getFaqSchema\(RECIPE_FAQS/);
});
