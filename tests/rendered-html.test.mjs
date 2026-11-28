import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { register } from "node:module";

register(new URL("./cloudflare-workers-hook.mjs", import.meta.url));

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
  // A home do protótipo não tem FAQ visível, então não declara FAQPage no schema.
  assert.doesNotMatch(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  // A entrada para o WhatsApp é a cesta (cartão marinho -> catálogo -> /reserva) e o botão flutuante.
  assert.match(html, /Peça pelo WhatsApp/);
  assert.match(html, /href="\/nacoes-unidas\/produtos"/);
  assert.match(html, /aria-label="[^"]*[Cc]esta/); // a cesta fica no cabeçalho (sem barra fixa de baixo)
  // Por enquanto o site mostra só a loja Nações Unidas.
  assert.match(html, /Nações Unidas/);
  assert.doesNotMatch(html, /Nossa Senhora de Fátima/);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
});

test("renders every landing page and unit page as an indexable route", async () => {
  const paths = [
    "/farmacia-em-sabara",
    "/entrega-de-medicamentos-em-sabara",
    "/jardim-vitoria",
    "/perfumaria-em-sabara",
    "/fatima",
    "/nacoes-unidas",
    "/itacolomi",
  ];

  for (const pathname of paths) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, pathname);
    assert.match(html, new RegExp(`<link rel="canonical" href="https:\\/\\/xn--uniofarmasabar-8gbu\\.com\\.br${pathname.replaceAll("/", "\\/")}"`), pathname);
    if (!['/fatima', '/nacoes-unidas', '/itacolomi'].includes(pathname)) {
      assert.match(html, /"@type":"FAQPage"/);
    }
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

  assert.match(html, /Ofertas em Sabará/);
  assert.match(html, /Promoções/);
  assert.match(html, /Em destaque/);
  assert.doesNotMatch(html, /offers-carousel-control/);
  assert.doesNotMatch(html, /Ofertas em preparação/);
  assert.match(html, /<link rel="canonical" href="https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/ofertas"/);
  assert.match(html, /Black Friday União Farma: ofertas em Sabará/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.equal((html.match(/<h1\b/gi) ?? []).length, 1);
  assert.doesNotMatch(html, /Tandrilax/);
  assert.doesNotMatch(html, /Melatonina Dr\. Good/);
  assert.doesNotMatch(html, /Aceviton/);
  assert.doesNotMatch(html, /Agil-C Kids/);
  assert.doesNotMatch(html, /Ômega 3 Katiguá/);
  assert.doesNotMatch(html, /ResfeGripe/);
  assert.doesNotMatch(html, /Expectorante genérico/);
  assert.match(html, /Flexalgin caixa 30 comprimidos/);
  assert.match(html, /Nimesulida 100mg caixa 12 comprimidos Globo Pharma/);
  assert.match(html, /Losartana 50mg caixa 30 comprimidos Teuto/);
  assert.match(html, /Nevralgex cartela 10 comprimidos/);
  assert.match(html, /Narix 0,5mg frasco 30ml adulto/);
  assert.match(html, /Leve 3 por R\$ 9,99/);
  assert.match(html, /Leve 3 por R\$ 8,94/);
  assert.match(html, /Venda sob prescrição médica/);
  assert.doesNotMatch(html, /Losartana 50mg caixa 30 comprimidos Neo/);
  assert.match(html, /Creme de pentear Seda 300ml/);
  assert.match(html, /Óleo Elseve Extraordinário 100ml/);
  assert.match(html, /Strepsils caixa 16 pastilhas laranja/);
  assert.match(html, /Strepsils caixa 16 pastilhas mel e limão/);
  assert.match(html, /Lavitan Cabelos e Unhas/);
  assert.doesNotMatch(html, /Válida até 27\/11\/2026/);
  assert.doesNotMatch(html, /só nesta sexta/);
  assert.doesNotMatch(html, /offer-image-placeholder/);
  assert.match(html, /enquanto durar o estoque/);
  assert.doesNotMatch(html, /offer-helper/);
  assert.doesNotMatch(html, /offer-delivery-link/);
  assert.match(html, /Promoção vale enquanto tiver naquela unidade/);
});

test("connects offers with every public section and route", async () => {
  const publicRoutes = [
    "/",
    "/novidades",
    "/novidades/bem-vindo-area-novidades",
    "/farmacia-em-sabara",
    "/entrega-de-medicamentos-em-sabara",
    "/perfumaria-em-sabara",
    "/jardim-vitoria",
    "/fatima",
    "/nacoes-unidas",
    "/itacolomi",
    "/privacidade",
    "/termos",
  ];

  for (const pathname of publicRoutes) {
    const response = await render(pathname);
    const html = await response.text();
    assert.equal(response.status, 200, pathname);
    assert.match(html, /href="\/ofertas"/, `${pathname} → ofertas`);
  }
});

test("keeps every public page connected to the complete site directory", async () => {
  // O site está sem rodapé (pedido do dono). /privacidade e /termos continuam no ar e precisam abrir,
  // mas não precisam mais aparecer como link em toda página. O cabeçalho ainda liga início, ofertas e perguntas.
  const headerDirectory = ["/", "/ofertas", "/perguntas"];
  const legalPages = ["/privacidade", "/termos"];
  // /receita segue publicada, mas sem link no site (a opção de enviar receita foi retirada).
  const pages = ["/", "/ofertas", "/perguntas", ...legalPages, "/receita", "/novidades", "/institucional", "/novidades/bem-vindo-area-novidades", "/nao-existe"];

  for (const pathname of pages) {
    const response = await render(pathname);
    const html = await response.text();

    if (pathname === "/nao-existe") {
      assert.equal(response.status, 404, pathname);
      continue;
    }
    assert.equal(response.status, 200, pathname);
    for (const destination of headerDirectory) {
      assert.ok(html.includes(`href="${destination}"`), `${pathname} → ${destination}`);
    }
  }

  const privacidade = await (await render("/privacidade")).text();
  assert.match(privacidade, /<h1[^>]*>Política de Privacidade<\/h1>/);
  const termos = await (await render("/termos")).text();
  assert.match(termos, /<h1[^>]*>Termos de Uso<\/h1>/);
});

test("renders the news index and the approved article with complete SEO", async () => {
  const indexResponse = await render("/novidades");
  assert.equal(indexResponse.status, 200);
  const indexHtml = await indexResponse.text();

  assert.match(indexHtml, /Novidades da União Farma/);
  assert.match(indexHtml, /href="\/novidades\/bem-vindo-area-novidades"/);
  assert.match(indexHtml, /news-card/);
  assert.match(indexHtml, /cognon-fos-novidade\.webp/);
  assert.match(indexHtml, /gripe-e-cuidados\.webp/);
  assert.match(indexHtml, /melatonina-dr-good-fini\.webp/);
  assert.doesNotMatch(indexHtml, /news-visual-placeholder/);
  assert.match(indexHtml, /<link rel="canonical" href="https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/novidades"/);
  assert.match(indexHtml, /novidades-og/);
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
  // O cabeçalho da loja tem o botão "Pedir no WhatsApp" (desktop) e o artigo tem o seu: dois ao todo.
  assert.equal((articleHtml.match(/data-track-event="whatsapp_click"/g) ?? []).length, 2);
  assert.equal((articleHtml.match(/<h1\b/gi) ?? []).length, 1);

  const missingResponse = await render("/novidades/nao-existe");
  assert.equal(missingResponse.status, 404);
});

test("keeps unit-specific data on all unit pages", async () => {
  const cases = [
    {
      pathname: "/fatima",
      name: "Fátima",
      heading: "Drogaria União Farma em Nossa Senhora de Fátima, Sabará",
      address: "Rua Cláudio, 902 — Nossa Senhora de Fátima, Sabará/MG",
      phone: "(31) 3673-2122",
      whatsapp: "(31) 98738-1786",
      saturdayClose: "20:00",
    },
    {
      pathname: "/nacoes-unidas",
      name: "Nações Unidas",
      heading: "Drogaria União Farma em Nações Unidas, Sabará",
      address: "Rua Inglaterra, 162 — Nações Unidas, Sabará/MG",
      phone: "(31) 3671-8506",
      whatsapp: "(31) 98762-9909",
      saturdayClose: "21:00",
    },
    {
      pathname: "/itacolomi",
      name: "Itacolomi",
      heading: "Drogaria União Farma no Itacolomi, Sabará",
      address: "Av. Joaquim Ferreira Madureira, 489 — Itacolomi, Sabará/MG",
      phone: "(31) 3673-3155",
      whatsapp: "(31) 99493-6960",
      saturdayClose: "20:00",
    },
  ];

  for (const unit of cases) {
    const response = await render(unit.pathname);
    const html = await response.text();

    assert.equal(response.status, 200, unit.pathname);
    assert.ok(html.includes(`<h1>${unit.heading}</h1>`), unit.pathname);
    assert.ok(html.includes(unit.address), unit.pathname);
    assert.ok(html.includes(unit.phone), unit.pathname);
    assert.match(html, new RegExp(`Sábado[\\s\\S]{0,200}${unit.saturdayClose}`));
  }
});

test("keeps local contact data, dataLayer events, SEO files and accessibility hooks", async () => {
  const [page, homePage, skipLink, layout, localLanding, analytics, analyticsModule, envExample, sitemap, robots, css, siteConfig, offers, attribution, newsPage, newsContent] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    // A home é montada por HomePage + cabeçalho da casca de loja (menu com aria-expanded).
    Promise.all([
      readFile(new URL("../app/HomePage.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/shop/ShopHeader.tsx", import.meta.url), "utf8"),
    ]).then((partes) => partes.join("\n")),
    readFile(new URL("../app/SkipLink.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/local-landing-page.tsx", import.meta.url), "utf8"),
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

  assert.match(skipLink, /skip-link/);
  assert.match(layout, /<SkipLink\s*\/>/);
  assert.match(homePage, /aria-expanded/);
  assert.match(homePage, /aria-label="Menu principal"/);
  assert.match(localLanding, /whatsapp_click/);
  assert.match(localLanding, /phone_click/);
  assert.match(localLanding, /get_directions/);
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
  // O gtag.js não vai mais no <head>: só é carregado depois do aceite (tests/analytics-consentimento.test.mjs).
  assert.doesNotMatch(layout, /<script[^>]*googletagmanager/);
  assert.match(analytics, /consent", "update"/);
  assert.match(layout, /chgP6OWdJAiM-yv_oPbit7Rf91vAsI7xDUWEuNQG1xk/);
  assert.match(sitemap, /entrega-de-medicamentos-em-sabara/);
  assert.doesNotMatch(sitemap, /\/ifood/);
  assert.match(sitemap, /\/jardim-vitoria/);
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
  // /novidades e /institucional seguem publicadas e no sitemap; o rodapé do protótipo não as lista.
  assert.doesNotMatch(page, /from "next\/link"/);
  assert.match(homePage, /Novidades da União Farma/);
  assert.match(newsPage, /news-empty/);
  assert.match(newsContent, /publicationStatus/);
  assert.match(newsContent, /contentApproved/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /color-scheme:\s*only light/);
  assert.doesNotMatch(css, /prefers-color-scheme:\s*dark/);
  assert.match(css, /min-height:\s*48px/);
});

test("GA4 loads directly with Consent Mode v2 defaults denied and tracks WhatsApp/phone clicks", async () => {
  const [bootstrap, consent, analytics] = await Promise.all([
    readFile(new URL("../app/ga-bootstrap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/AnalyticsConsent.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/analytics.ts", import.meta.url), "utf8"),
  ]);
  assert.match(bootstrap, /G-1N8E5G39KF/);
  assert.match(bootstrap, /gtag\('consent','default',\{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'/);
  assert.match(bootstrap, /function gtag\(\)\{dataLayer\.push\(arguments\);\}/);
  assert.match(consent, /ad_user_data: "granted"/);
  assert.match(consent, /process\.env\.NEXT_PUBLIC_GTM_CONTAINER_ID \?\? ""/);
  assert.doesNotMatch(consent, /GTM-M8BXJCHB/);
  assert.match(analytics, /"whatsapp_click"/);
  assert.match(analytics, /"phone_click"/);
  assert.match(analytics, /link_location/);
  assert.match(analytics, /nacoes_unidas/);
  // Meta Pixel continua atrás do consentimento.
  assert.match(analytics, /__uniaoFarmaAnalyticsLoaded\) trackingWindow\.fbq/);
});

test("cookie banner is mounted (not dynamic ssr:false) and CSP lets GA4 send consented hits", async () => {
  const [layout, middleware, nextConfig] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../middleware.ts", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);
  // Com dynamic({ssr:false}) o vinext não montava o banner e ninguém conseguia aceitar.
  assert.match(layout, /import AnalyticsConsent from "\.\/AnalyticsConsent"/);
  assert.doesNotMatch(layout, /dynamic\(\(\) => import\("\.\/AnalyticsConsent"\)/);
  assert.match(layout, /import PwaRegister from "\.\/PwaRegister"/);
  assert.match(layout, /import OfferAlerts from "\.\/OfferAlerts"/);
  for (const source of [middleware, nextConfig]) {
    assert.match(source, /script-src[^"]*https:\/\/connect\.facebook\.net/);
    const connect = source.match(/connect-src[^"]*/)?.[0] ?? "";
    for (const host of [
      "https://*.google-analytics.com",
      "https://analytics.google.com",
      "https://*.googletagmanager.com",
      "https://*.g.doubleclick.net",
      "https://www.facebook.com",
      "https://connect.facebook.net",
      "https://*.clarity.ms",
      "https://c.bing.com",
    ]) {
      assert.ok(connect.includes(host), `connect-src deve liberar ${host}`);
    }
    assert.match(source, /script-src[^"]*https:\/\/www\.clarity\.ms/);
    assert.match(source, /script-src[^"]*https:\/\/scripts\.clarity\.ms/);
  }
});

test("o Alvará Sanitário e a AFE da Anvisa continuam no cadastro da loja", async () => {
  // O site está sem rodapé (pedido do dono), então esses registros não aparecem no HTML público.
  // Eles ficam no cadastro da empresa e no componente do rodapé, para não se perderem.
  const [company, footer] = await Promise.all([
    readFile(new URL("../app/company.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/SiteFooter.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(company, /Alvará Sanitário nº 207\/2026/);
  assert.match(company, /AFE Anvisa nº 7\.61823-1/);
  assert.match(footer, /COMPANY\.alvara/);
  assert.match(footer, /COMPANY\.afe/);
});

test("Fátima e Itacolomi voltam aos buscadores, com canonical e schema da própria loja", async () => {
  const cases = [
    { pathname: "/fatima", street: "Rua Cláudio, 902", name: "Nossa Senhora de Fátima" },
    { pathname: "/itacolomi", street: "Av. Joaquim Ferreira Madureira, 489", name: "Itacolomi", alternate: "Droga Manaus" },
  ];
  for (const unit of cases) {
    const html = await (await render(unit.pathname)).text();
    assert.match(html, /<meta name="robots" content="index, follow"/i, `${unit.pathname} indexável`);
    assert.doesNotMatch(html, /noindex/i, `${unit.pathname} sem noindex`);
    assert.match(html, new RegExp(`<link rel="canonical" href="https:\\/\\/xn--uniofarmasabar-8gbu\\.com\\.br${unit.pathname.replaceAll("/", "\\/")}"`));
    assert.match(html, /"@type":\["Pharmacy","LocalBusiness"\]/, `${unit.pathname} schema`);
    assert.match(html, new RegExp(`"streetAddress":"${unit.street.replaceAll(" ", "\\ ")}"`), `${unit.pathname} endereço no schema`);
    if (unit.alternate) assert.match(html, new RegExp(`"${unit.alternate}"`), `${unit.pathname} alternateName`);
    // As lojas ainda não vendem pelo site: página institucional, sem mapa, entrega nem cesta.
    assert.doesNotMatch(html, /Mapa interativo|Como chegar|Pedir entrega|Pedir no WhatsApp|Bairros atendidos|iFood/i, `${unit.pathname} sem mapa, entrega nem pedido`);
    assert.match(html, /Grupo de Ofertas no WhatsApp/, `${unit.pathname} mantém o grupo de ofertas`);
    assert.match(html, /Falar no WhatsApp/, `${unit.pathname} WhatsApp de contato geral`);
    assert.match(html, /Ligar[\s\S]{0,30}\(31\)/, `${unit.pathname} telefone`);
  }
  const mapa = await (await render("/sitemap.xml")).text();
  assert.match(mapa, /\/fatima</, "Fátima no mapa do site");
  assert.match(mapa, /\/itacolomi</, "Itacolomi no mapa do site");
  assert.match(mapa, /\/nacoes-unidas</, "Nações Unidas segue no mapa do site");

  const institucional = await (await render("/institucional")).text();
  assert.match(institucional, /Rua Cláudio, 902/);
  assert.match(institucional, /Av\. Joaquim Ferreira Madureira, 489/);
  assert.match(institucional, /Rua Inglaterra, 162/);

  const horarios = await (await render("/farmacia-aberta-domingo-sabara")).text();
  assert.match(horarios, /3 lojas/);
  assert.match(horarios, /Fátima/);
  assert.match(horarios, /Itacolomi/);

  const entrega = await (await render("/entrega-de-medicamentos-em-sabara")).text();
  assert.match(entrega, /Jardim Vitória/);
  assert.match(entrega, /Fátima/);
  assert.match(entrega, /Itacolomi/);
});

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

test("ficha de produto abre (200) sem a página de erro do Vinext", async () => {
  const catalogo = JSON.parse(await readFile(new URL("../app/nacoes-unidas/produtos/dados/catalogo-nacoes.json", import.meta.url), "utf8"));
  const item = catalogo.itens.find((i) => i.categoria !== "Medicamentos" && !i.isMIP && i.preco > 0);
  assert.ok(item, "precisa de um item não medicamento no catálogo");
  const pathname = `/nacoes-unidas/produtos/${slugify(item.nome)}`;
  const response = await render(pathname);
  assert.equal(response.status, 200, pathname);
  const html = await response.text();
  assert.doesNotMatch(html, /id="__next_error__"/, pathname);
  assert.doesNotMatch(html, /This page couldn.t load/);
  assert.match(html, /<h1[^>]*>/);
  assert.match(html, /pdp-galeria|produto-sem-foto/);
});

test("cache: feed e catálogo não saem com max-age=0; HTML público tem s-maxage; reserva fica no-store", async () => {
  const feed = await render("/feeds/google-shopping.xml");
  assert.equal(feed.status, 200);
  const feedCc = feed.headers.get("cache-control") ?? "";
  assert.match(feedCc, /max-age=3600/);
  assert.doesNotMatch(feedCc, /max-age=0/);

  const catalogo = await render("/api/catalogo");
  assert.equal(catalogo.status, 200);
  const catCc = catalogo.headers.get("cache-control") ?? "";
  assert.match(catCc, /max-age=300/);
  assert.doesNotMatch(catCc, /max-age=0/);

  const home = await render("/");
  assert.equal(home.status, 200);
  const homeCc = home.headers.get("cache-control") ?? "";
  assert.match(homeCc, /s-maxage=60/);

  const reserva = await render("/reserva");
  const reservaCc = reserva.headers.get("cache-control") ?? "";
  assert.match(reservaCc, /no-store/);
});

test("palavra 'drogaria' nos títulos da home e das lojas", async () => {
  const expectations = {
    "/": /<title>Drogaria e Farmácia em Sabará com entrega \| União Farma<\/title>/,
    "/farmacia-em-sabara": /<title>Drogaria e Farmácia em Sabará \| União Farma<\/title>/,
    "/fatima": /<title>Drogaria União Farma Fátima \| Farmácia em Sabará<\/title>/,
    "/itacolomi": /<title>Drogaria União Farma Itacolomi \| Farmácia em Sabará<\/title>/,
    "/nacoes-unidas": /<title>Drogaria União Farma Nações Unidas \| Farmácia em Sabará<\/title>/,
    "/jardim-vitoria": /<title>Drogaria União Farma Fátima \| Entrega no Jardim Vitória<\/title>/,
  };
  for (const [pathname, titlePattern] of Object.entries(expectations)) {
    const html = await (await render(pathname)).text();
    assert.match(html, titlePattern, pathname);
  }
});
