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
    ["app/nacoes-unidas/produtos/page.tsx", "canonical: `/${SLUG}`"],
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
  assert.deepEqual(map, { fatima: ["Nossa Senhora de Fátima", "Jardim Vitória"], nacoes: ["Nações Unidas", "General Carneiro", "Vila Rica", "Itacolomi", "Coqueiros", "Ipê Amarelo", "Valparaíso", "Vila São José"], itacolomi: ["Itacolomi"] });
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
  assert.match(byId.nacoes.deliveryScope, /^nos bairros Nações Unidas, General Carneiro/);
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
  assert.match(layout, /address: PUBLIC_UNITS\.map\(\(unit\) => getPostalAddress\(unit\)\)/);
  assert.match(layout, /paymentAccepted: PAYMENT_ACCEPTED/);

  // /perguntas tem FAQPage com as mesmas perguntas que renderiza; /farmacia-em-sabara tem schema das lojas.
  const perguntas = read("app/perguntas/page.tsx");
  assert.match(perguntas, /faqs: CUSTOMER_QUESTIONS/);
  assert.match(perguntas, /CUSTOMER_QUESTIONS\.map/);
  assert.match(read("app/farmacia-em-sabara/page.tsx"), /includeUnitSchema: true/);
  assert.match(read("app/local-landing-page.tsx"), /units: config\.includeUnitSchema \? PUBLIC_UNITS : undefined/);

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
  assert.match(page, /A loja União Farma Nações Unidas, na .*está no iFood/);
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
  // O rodapé do protótipo não lista o iFood; os links para /ifood ficam nas páginas de bairro e de entrega.
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
  assert.doesNotMatch(read("app/sitemap.ts"), /\/jardim-vitoria/); // noindex enquanto a loja Fátima não é pública
  assert.match(page, /robots: \{ index: false/);
  assert.match(read("app/sitemap-dates.ts"), /jardimVitoria:/);
  assert.match(read("app/entrega-de-medicamentos-em-sabara/page.tsx"), /href="\/jardim-vitoria"/);

  assert.match(read("app/structured-data.ts"), /priceRange: "\$\$"/);
  assert.match(read("app/receita/page.tsx"), /getFaqSchema\(RECIPE_FAQS/);
});

test("departamentos: cada página entra no sitemap, é indexável e traz a lista no HTML", async () => {
  const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
  const sitemap = await read("app/sitemap.ts");
  assert.match(sitemap, /departamentosPublicos\(\)\.map/);
  assert.match(sitemap, /\/departamentos\/\$\{d\.slug\}/);
  assert.match(await read("app/sitemap-dates.ts"), /departamentos:/);
  const pagina = await read("app/departamentos/[slug]/page.tsx");
  assert.match(pagina, /robots: \{ index: Boolean\(dep\), follow: true \}/);
  assert.match(pagina, /canonical: dep \? `\/departamentos\/\$\{dep\.slug\}`/);
  assert.match(pagina, /!dep \|\| dep\.provisorio\) notFound/);
  assert.match(await read("app/nacoes-unidas/produtos/ListaDrogasil.tsx"), /departamentosPublicos\(\)\.map/); // a lista de departamentos agora fica na lateral da lista
  assert.match(pagina, /grupos=\{grupos\}/);
  assert.match(pagina, /application\/ld\+json/);
});

test("SEO técnico: Open Graph próprio, breadcrumb e título com a marca nas páginas indexáveis", async () => {
  const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
  // Sem openGraph próprio a página herda og:url e og:title da home (layout).
  for (const [file, path] of [
    ["app/perguntas/page.tsx", "/perguntas"],
    ["app/institucional/page.tsx", "/institucional"],
    ["app/privacidade/page.tsx", "/privacidade"],
    ["app/termos/page.tsx", "/termos"],
    ["app/encarte/page.tsx", "/encarte"],
  ]) {
    const source = await read(file);
    assert.match(source, /openGraph: \{ title: TITLE, description: DESCRIPTION, url: /, `${file} sem openGraph`);
    assert.ok(source.includes(`\`\${SITE_URL}${path}\``), `${file} sem a URL absoluta da página`);
    assert.match(source, /twitter: \{ card: "summary_large_image"/, `${file} sem twitter card`);
    assert.match(source, /title: \{ absolute: TITLE \}/, file);
    assert.match(source, /getPageStructuredData\(\{/, `${file} sem breadcrumb no JSON-LD`);
    assert.match(source, /application\/ld\+json/, file);
  }
  for (const file of ["app/privacidade/page.tsx", "app/termos/page.tsx"]) {
    assert.match(await read(file), /const TITLE = `\$\{HEADING\} \| União Farma Sabará`/, `${file}: título com a marca`);
  }
});

test("SEO técnico: área interna inteira fora do Google e robots.txt", async () => {
  const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
  // O layout cobre a tela que não declara metadata (ex.: /interno/metricas).
  assert.match(await read("app/interno/layout.tsx"), /export const metadata: Metadata = \{\s+robots: \{ index: false, follow: false \},/);
  const { default: robots } = await import("../app/robots.ts");
  const { SITE_URL } = await import("../app/site-config.ts");
  const config = robots();
  assert.deepEqual(config.rules.disallow, ["/api/", "/interno", "/interno/"]);
  assert.equal(config.sitemap, `${SITE_URL}/sitemap.xml`);
});

test("SEO técnico: sitemap só com URL canônica, absoluta, única e de página indexável", async () => {
  const { default: sitemap } = await import("../app/sitemap.ts");
  const { SITE_URL } = await import("../app/site-config.ts");
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  assert.equal(new Set(urls).size, urls.length, "URL repetida no sitemap");
  for (const entry of entries) {
    assert.ok(entry.url.startsWith(`${SITE_URL}/`), entry.url);
    assert.ok(entry.url === `${SITE_URL}/` || !entry.url.endsWith("/"), `${entry.url} com barra final`);
    assert.ok(entry.lastModified instanceof Date && !Number.isNaN(entry.lastModified.getTime()), `${entry.url} sem lastmod válido`);
    assert.ok(entry.lastModified.getTime() <= Date.now(), `${entry.url} com lastmod no futuro`);
  }
  // Páginas fora do Google (noindex) e rotas internas não entram no mapa do site.
  for (const path of ["/fatima", "/itacolomi", "/reserva", "/whatsapp", "/nacoes-unidas/produtos", "/interno", "/api"]) {
    assert.ok(!urls.some((url) => url === `${SITE_URL}${path}` || url.startsWith(`${SITE_URL}${path}/`)), `${path} não pode estar no sitemap`);
  }
});

test("SEO técnico: JSON-LD da loja válido, sem campo inventado e com horário especial confirmado", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  const { getPageStructuredData, getPostalAddress, getSpecialOpeningHoursSpecification, getUnitBusinessSchema } = await import("../app/structured-data.ts");
  const { SPECIAL_DATES, NATIONAL_HOLIDAYS } = await import("../app/hours-exceptions.ts");
  const byId = Object.fromEntries(UNITS.map((u) => [u.id, u]));

  // PostalAddress só com propriedades que existem no schema.org (não há addressNeighborhood).
  const address = getPostalAddress(byId.nacoes);
  assert.deepEqual(Object.keys(address).sort(), ["@type", "addressCountry", "addressLocality", "addressRegion", "postalCode", "streetAddress"]);
  assert.equal(address.streetAddress, "Rua Inglaterra, 162 - Nações Unidas");
  assert.equal(address.postalCode, "34590-010");

  for (const unit of UNITS) {
    const schema = JSON.parse(JSON.stringify(getUnitBusinessSchema(unit)));
    assert.deepEqual(schema["@type"], ["Pharmacy", "LocalBusiness"]);
    assert.match(schema.telephone, /^\+55\d{10,11}$/, "telefone em E.164");
    assert.match(schema.contactPoint.telephone, /^\+55\d{10,11}$/, "WhatsApp em E.164");
    assert.equal(schema.openingHoursSpecification.length, 7);
    for (const spec of schema.openingHoursSpecification) {
      assert.match(spec.opens, /^\d{2}:\d{2}$/);
      assert.match(spec.closes, /^\d{2}:\d{2}$/);
    }
    assert.equal(typeof schema.geo.latitude, "number");
    for (const url of schema.sameAs) assert.match(url, /^https:\/\//);
    // Nada que o site não sabe: sem nota, avaliação nem oferta com preço.
    for (const forbidden of ["aggregateRating", "review", "offers", "makesOffer"]) assert.equal(schema[forbidden], undefined, forbidden);
  }

  // Horário especial: só datas com horário confirmado (Finados, vésperas), nunca "fechado" presumido em feriado.
  const all = getSpecialOpeningHoursSpecification(byId.nacoes, "2026-01-01");
  assert.deepEqual(all.map((s) => s.validFrom), ["2026-11-02", "2026-12-24", "2026-12-31", "2027-12-24", "2027-12-31"]);
  for (const spec of all) {
    assert.equal(spec["@type"], "OpeningHoursSpecification");
    assert.equal(spec.validFrom, spec.validThrough);
    assert.equal(spec.opens, "08:00");
    assert.equal(spec.closes, "12:00");
    assert.ok(SPECIAL_DATES[spec.validFrom], `${spec.validFrom} precisa estar em SPECIAL_DATES`);
  }
  assert.equal(getSpecialOpeningHoursSpecification(byId.fatima, "2026-01-01")[0].opens, "07:00");
  assert.ok(NATIONAL_HOLIDAYS["2026-12-25"]);
  assert.ok(!all.some((s) => s.validFrom === "2026-12-25"), "Natal não tem horário confirmado: fica fora do schema");
  // Datas passadas saem; sem data futura, a lista fica vazia e a propriedade nem aparece.
  assert.deepEqual(getSpecialOpeningHoursSpecification(byId.nacoes, "2027-12-25").map((s) => s.validFrom), ["2027-12-31"]);
  assert.deepEqual(getSpecialOpeningHoursSpecification(byId.nacoes, "2028-01-01"), []);

  // Grafo da página: @context, WebPage, BreadcrumbList com posições em ordem e FAQPage.
  const graph = getPageStructuredData({
    name: "Teste",
    url: "https://exemplo.test/pagina",
    breadcrumbs: [{ name: "Início", url: "https://exemplo.test/" }, { name: "Página", url: "https://exemplo.test/pagina" }],
    faqs: [{ q: "Pergunta?", a: "Resposta." }],
  });
  const parsed = JSON.parse(JSON.stringify(graph));
  assert.equal(parsed["@context"], "https://schema.org");
  assert.deepEqual(parsed["@graph"].map((node) => node["@type"]), ["WebPage", "BreadcrumbList", "FAQPage"]);
  assert.deepEqual(parsed["@graph"][1].itemListElement.map((item) => item.position), [1, 2]);
  assert.equal(parsed["@graph"][2].mainEntity[0].acceptedAnswer.text, "Resposta.");
});

test("SEO técnico: FAQPage só onde a pergunta aparece na tela; artigo com imagem, autor e página", async () => {
  const read = (f) => readFile(new URL(`../${f}`, import.meta.url), "utf8");
  // Loja institucional (sem FAQ na tela) não publica FAQPage.
  assert.match(await read("app/NeighborhoodPage.tsx"), /faqs: institucional \? undefined : content\.faqs/);
  const artigo = await read("app/novidades/[slug]/page.tsx");
  assert.match(artigo, /url: "\/novidades-og-optimized\.jpg", width: 1200, height: 629/, "artigo sem foto precisa de og:image padrão");
  assert.match(artigo, /mainEntityOfPage: \{ "@type": "WebPage", "@id": `\$\{pageUrl\}#webpage`, url: pageUrl \}/);
  assert.match(artigo, /author: \{ "@id": `\$\{SITE_URL\}\/#organization` \}/);
  assert.match(artigo, /"Novidade não encontrada", robots: \{ index: false, follow: false \}/);
  // Produto: sem oferta, preço, estoque nem avaliação no schema (vale também para controlado, Portaria 344).
  const { jsonLdProduto } = await import("../app/nacoes-unidas/produtos/produto.ts");
  const produto = jsonLdProduto({ nome: "Produto de teste 10 mg", lab: "Marca", categoria: "Medicamentos", url: "https://exemplo.test/p" });
  assert.equal(produto["@type"], "Product");
  for (const forbidden of ["offers", "aggregateRating", "review"]) assert.equal(produto[forbidden], undefined, forbidden);
});
