import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the local SEO home page with conversion and schema signals", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /<html lang="pt-BR"(?:\s[^>]*)?>/i);
  assert.match(html, /Farmácia em Sabará/);
  assert.match(html, /uniao-farma-logo\.webp/);
  assert.match(html, /<link rel="canonical" href="https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/?"/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /utm_source=site/);
  assert.match(html, /utm_source=site/);
  assert.match(html, /Nossa Senhora de Fátima/);
  assert.match(html, /Nações Unidas/);
  assert.match(html, /Itacolomi/);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
});

test("renders every landing page and unit page as an indexable route", async () => {
  const paths = [
    "/farmacia-em-sabara",
    "/entrega-de-medicamentos-em-sabara",
    "/perfumaria-em-sabara",
    "/unidades/nossa-senhora-de-fatima",
    "/unidades/nacoes-unidas",
    "/unidades/itacolomi",
  ];

  for (const pathname of paths) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, pathname);
    assert.match(html, new RegExp(`<link rel="canonical" href="https:\\/\\/xn--uniofarmasabar-8gbu\\.com\\.br${pathname.replaceAll("/", "\\/")}"`), pathname);
    assert.match(html, /"@type":"FAQPage"/);
    assert.match(html, /"@type":"BreadcrumbList"/);
    if (pathname === "/farmacia-em-sabara") {
      assert.match(html, /data-track-event="whatsapp_click"/);
      assert.match(html, /data-track-event="phone_click"/);
      assert.match(html, /data-track-event="get_directions"/);
    }
  }
});

test("renders the confirmed offers landing page and keeps blocked products out", async () => {
  const response = await render("/ofertas?utm_source=google&utm_medium=cpc&gclid=test-click-id");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Ofertas da União Farma em Sabará/);
  assert.match(html, /Ofertas aprovadas da União Farma/);
  assert.match(html, /Promoções em destaque/);
  assert.doesNotMatch(html, /offers-carousel-control/);
  assert.doesNotMatch(html, /Ofertas em preparação/);
  assert.match(html, /<link rel="canonical" href="https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/ofertas"/);
  assert.match(html, /Ofertas de Farmácia e Perfumaria em Sabará \| União Farma/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.doesNotMatch(html, /"@type":"Product"/);
  assert.doesNotMatch(html, /"@type":"Offer"/);
  assert.doesNotMatch(html, /Tandrilax/);
  assert.doesNotMatch(html, /Melatonina Dr\. Good/);
  assert.doesNotMatch(html, /Aceviton/);
  assert.doesNotMatch(html, /Agil-C Kids/);
  assert.doesNotMatch(html, /Ômega 3 Katiguá/);
  assert.doesNotMatch(html, /Lavitan Cabelos e Unhas/);
  assert.doesNotMatch(html, /Strepsils/);
  assert.doesNotMatch(html, /ResfeGripe/);
  assert.doesNotMatch(html, /Expectorante genérico/);
  assert.match(html, /Creme Seda para pentear 300 ml/);
  assert.match(html, /src="\/promotions\/drafts\/seda-creme-pentear-original\.jpeg"/);
  assert.doesNotMatch(html, /offer-image-placeholder/);
  assert.match(html, /Oferta válida enquanto durarem os estoques/);
  assert.doesNotMatch(html, /offer-price/);
  assert.doesNotMatch(html, /offer-helper/);
  assert.doesNotMatch(html, /offer-delivery-link/);
  assert.match(html, /Preços e disponibilidade podem variar conforme o estoque de cada unidade/);
});

test("connects offers with every public section and route", async () => {
  const publicRoutes = [
    "/",
    "/novidades",
    "/novidades/bem-vindo-area-novidades",
    "/farmacia-em-sabara",
    "/entrega-de-medicamentos-em-sabara",
    "/perfumaria-em-sabara",
    "/unidades/nossa-senhora-de-fatima",
    "/unidades/nacoes-unidas",
    "/unidades/itacolomi",
    "/privacidade",
    "/termos",
  ];
  const directoryRoutes = publicRoutes.filter((pathname) => !pathname.startsWith("/novidades/"));

  const offersResponse = await render("/ofertas");
  const offersHtml = await offersResponse.text();
  for (const pathname of directoryRoutes) {
    assert.ok(offersHtml.includes(`href="${pathname}"`), `ofertas → ${pathname}`);
  }

  for (const pathname of publicRoutes) {
    const response = await render(pathname);
    const html = await response.text();
    assert.equal(response.status, 200, pathname);
    assert.match(html, /href="\/ofertas"/, `${pathname} → ofertas`);
  }
});

test("keeps every public page connected to the complete site directory", async () => {
  const siteDirectory = [
    "/",
    "/ofertas",
    "/novidades",
    "/farmacia-em-sabara",
    "/entrega-de-medicamentos-em-sabara",
    "/perfumaria-em-sabara",
    "/unidades/nossa-senhora-de-fatima",
    "/unidades/nacoes-unidas",
    "/unidades/itacolomi",
    "/privacidade",
    "/termos",
  ];
  const pages = [...siteDirectory, "/novidades/bem-vindo-area-novidades", "/nao-existe"];

  for (const pathname of pages) {
    const response = await render(pathname);
    const html = await response.text();

    assert.ok([200, 404].includes(response.status), pathname);
    for (const destination of siteDirectory) {
      assert.ok(html.includes(`href="${destination}"`), `${pathname} → ${destination}`);
    }
  }
});

test("renders the news index and the approved article with complete SEO", async () => {
  const indexResponse = await render("/novidades");
  assert.equal(indexResponse.status, 200);
  const indexHtml = await indexResponse.text();

  assert.match(indexHtml, /Novidades, informações e conteúdos da União Farma/);
  assert.match(indexHtml, /href="\/novidades\/bem-vindo-area-novidades"/);
  assert.match(indexHtml, /news-card-no-image/);
  assert.match(indexHtml, /cognon-fos-novidade\.jpg/);
  assert.match(indexHtml, /gripe-e-cuidados\.jpg/);
  assert.match(indexHtml, /melatonina-dr-good-fini\.jpg/);
  assert.doesNotMatch(indexHtml, /news-visual-placeholder/);
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/novidades"/);
  assert.match(indexHtml, /novidades-og\.png/);
  assert.match(indexHtml, /"@type":"CollectionPage"/);
  assert.match(indexHtml, /"@type":"BreadcrumbList"/);
  assert.equal((indexHtml.match(/<h1\b/gi) ?? []).length, 1);

  const articlePath = "/novidades/bem-vindo-area-novidades";
  const articleResponse = await render(articlePath);
  assert.equal(articleResponse.status, 200);
  const articleHtml = await articleResponse.text();

  assert.match(articleHtml, /Bem-vindo à área de novidades da União Farma/);
  assert.match(articleHtml, new RegExp(`<link rel="canonical" href="https:\\/\\/xn--uniofarmasabar-8gbu\\.com\\.br${articlePath.replaceAll("/", "\\/")}"`));
  assert.match(articleHtml, /"@type":"Article"/);
  assert.match(articleHtml, /"datePublished":"2026-08-16"/);
  assert.match(articleHtml, /"publisher":\{"@id":"https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/#organization"\}/);
  assert.doesNotMatch(articleHtml, /"author":/);
  assert.doesNotMatch(articleHtml, /"image":/);
  assert.equal((articleHtml.match(/data-track-event="whatsapp_click"/g) ?? []).length, 3);
  assert.equal((articleHtml.match(/<h1\b/gi) ?? []).length, 1);

  const missingResponse = await render("/novidades/nao-existe");
  assert.equal(missingResponse.status, 404);
});

test("keeps unit-specific data and approved conversion tracking on all unit pages", async () => {
  const cases = [
    {
      pathname: "/unidades/nossa-senhora-de-fatima",
      name: "Nossa Senhora de Fátima",
      address: "Rua Cláudio, 902 — Nossa Senhora de Fátima, Sabará/MG",
      phone: "(31) 3673-2122",
      whatsapp: "(31) 98738-1786",
      description: "União Farma no bairro Nossa Senhora de Fátima, em Sabará. Farmácia e perfumaria com atendimento presencial, WhatsApp, telefone e entrega sob consulta.",
      saturdayClose: "20:00",
      trackingUnit: "nossa_senhora_de_fatima",
    },
    {
      pathname: "/unidades/nacoes-unidas",
      name: "Nações Unidas",
      address: "Rua Inglaterra, 162 — Nações Unidas, Sabará/MG",
      phone: "(31) 3671-8506",
      whatsapp: "(31) 98762-9909",
      description: "União Farma no bairro Nações Unidas, em Sabará. Farmácia e perfumaria com atendimento presencial, WhatsApp, telefone e entrega sob consulta.",
      saturdayClose: "21:00",
      trackingUnit: "nacoes_unidas",
    },
    {
      pathname: "/unidades/itacolomi",
      name: "Itacolomi",
      address: "Rua Joaquim Ferreira Moreira, 489 — Itacolomi, Sabará/MG",
      phone: "(31) 3673-3155",
      whatsapp: "(31) 99493-6960",
      description: "União Farma no bairro Itacolomi, em Sabará. Farmácia e perfumaria com atendimento presencial, WhatsApp, telefone e entrega sob consulta.",
      saturdayClose: "20:00",
      trackingUnit: "itacolomi",
    },
  ];

  for (const unit of cases) {
    const response = await render(unit.pathname);
    const html = await response.text();

    assert.equal(response.status, 200, unit.pathname);
    assert.match(html, new RegExp(`Farmácia ${unit.name} em Sabará`));
    assert.ok(html.includes(unit.address), unit.pathname);
    assert.ok(html.includes(unit.phone), unit.pathname);
    assert.ok(html.includes(unit.whatsapp), unit.pathname);
    assert.ok(html.includes(unit.description), unit.pathname);
    assert.match(html, new RegExp(`Sábado[\\s\\S]{0,200}${unit.saturdayClose}`));
    assert.match(html, new RegExp(`data-track-unit="${unit.trackingUnit}"`));
    assert.equal((html.match(/data-track-event="whatsapp_click"/g) ?? []).length, 6, unit.pathname);
    assert.equal((html.match(/data-track-event="phone_click"/g) ?? []).length, 2, unit.pathname);
    assert.equal((html.match(/data-track-event="get_directions"/g) ?? []).length, 2, unit.pathname);
    assert.match(html, /data-track-placement="hero"/);
    assert.match(html, /data-track-placement="location"/);
    assert.match(html, /data-track-placement="delivery"/);
    assert.match(html, /data-track-placement="product_consultation"/);
    assert.match(html, /data-track-placement="footer"/);
    assert.match(html, /data-track-placement="sticky"/);
    assert.doesNotMatch(html, /data-track-event="maps_click"/);
    assert.doesNotMatch(html, /data-track-event="delivery_inquiry"/);
  }
});

test("keeps local contact data, dataLayer events, SEO files and accessibility hooks", async () => {
  const [page, unitPage, layout, analytics, analyticsModule, envExample, sitemap, robots, css, siteConfig, offers, attribution, newsPage, newsContent] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/unidades/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/AnalyticsConsent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/analytics.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/site-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/offers.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/campaign-attribution.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/novidades/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/news-content.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /skip-link/);
  assert.match(page, /aria-expanded/);
  assert.match(page, /aria-label="Menu principal"/);
  assert.match(page, /whatsapp_click/);
  assert.match(page, /phone_click/);
  assert.match(page, /maps_click/);
  assert.match(page, /delivery_inquiry/);
  assert.match(page, /phone_click/);
  assert.match(unitPage, /data-track-event="whatsapp_click"/);
  assert.match(unitPage, /get_directions/);
  assert.match(unitPage, /data-track-placement/);
  assert.match(unitPage, /product_consultation/);
  assert.match(unitPage, /unit\.slug\.replace\(\/-\/g, "_"\)/);
  assert.match(unitPage, /getUnitFaqs/);
  assert.match(siteConfig, /https:\/\/xn--uniofarmasabar-8gbu\.com\.br/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(layout, /data-theme="light"/);
  assert.match(analytics, /NEXT_PUBLIC_GTM_CONTAINER_ID/);
  assert.match(analytics, /dataLayer/);
  assert.match(analyticsModule, /google_ads_conversion/);
  assert.match(analyticsModule, /NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL/);
  assert.match(envExample, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION/);
  assert.match(envExample, /NEXT_PUBLIC_GOOGLE_ADS_ID/);
  assert.match(layout, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION/);
  assert.match(analytics, /GTM-M8BXJCHB/);
  assert.match(layout, /chgP6OWdJAiM-yv_oPbit7Rf91vAsI7xDUWEuNQG1xk/);
  assert.match(sitemap, /entrega-de-medicamentos-em-sabara/);
  assert.match(sitemap, /\/ofertas/);
  assert.match(sitemap, /\/novidades/);
  assert.match(robots, /sitemap/);
  assert.match(offers, /canPublishOffer/);
  assert.match(offers, /canUseInAds/);
  assert.match(offers, /priceConfirmed/);
  assert.match(offers, /validityConfirmed/);
  assert.match(offers, /while_stock_lasts/);
  assert.match(offers, /prescription_blocked/);
  assert.match(attribution, /gclid/);
  assert.match(attribution, /utm_campaign/);
  assert.match(page, /href="\/novidades"/);
  assert.doesNotMatch(page, /from "next\/link"/);
  assert.doesNotMatch(unitPage, /\/#unidades"/);
  assert.match(page, /Ver todas as novidades/);
  assert.match(newsPage, /news-empty/);
  assert.match(newsContent, /publicationStatus/);
  assert.match(newsContent, /contentApproved/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /color-scheme:\s*only light/);
  assert.doesNotMatch(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /breadcrumb/);
});
