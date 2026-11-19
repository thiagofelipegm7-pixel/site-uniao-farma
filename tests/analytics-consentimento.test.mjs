import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** Roda o trecho do <head> num navegador de mentira e devolve o que ele fez. */
async function rodarBootstrap({ consentimento, caminho = "/" }) {
  const { getGtagBootstrapScript, CONSENT_STORAGE_KEY } = await import("../app/ga-bootstrap.ts");
  const scripts = [];
  const contexto = {
    location: { pathname: caminho },
    localStorage: { getItem: (chave) => (chave === CONSENT_STORAGE_KEY ? consentimento : null) },
    document: { createElement: () => ({}), head: { appendChild: (s) => scripts.push(s) } },
    Date,
  };
  contexto.window = contexto; // no navegador, window é o próprio escopo global
  vm.runInNewContext(getGtagBootstrapScript(), contexto);
  const fila = [...contexto.dataLayer].map((a) => Array.from(a));
  return { scripts, fila };
}

// O banner diz "Analytics só com autorização" e a /privacidade diz que o Google Analytics só é carregado depois do aceite.
test("sem aceite, o trecho do <head> não carrega nada do Google", async () => {
  for (const consentimento of [null, "rejected", "qualquer coisa"]) {
    const { scripts, fila } = await rodarBootstrap({ consentimento });
    assert.deepEqual(scripts, [], `consentimento=${consentimento}: nenhum script pode ser inserido`);
    assert.ok(fila.some((a) => a[0] === "consent" && a[1] === "default" && a[2].analytics_storage === "denied"));
    assert.ok(!fila.some((a) => a[0] === "consent" && a[1] === "update"), "sem aceite não há liberação de consentimento");
  }
});

test("com aceite guardado, libera o consentimento e carrega o gtag.js (menos no painel da equipe)", async () => {
  const { GTAG_SCRIPT_ID, GTAG_SCRIPT_URL } = await import("../app/ga-bootstrap.ts");
  const { scripts, fila } = await rodarBootstrap({ consentimento: "accepted" });
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].id, GTAG_SCRIPT_ID);
  assert.equal(scripts[0].src, GTAG_SCRIPT_URL);
  assert.match(GTAG_SCRIPT_URL, /^https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-/);
  const liberou = fila.findIndex((a) => a[0] === "consent" && a[1] === "update" && a[2].analytics_storage === "granted");
  assert.ok(liberou >= 0 && liberou < fila.findIndex((a) => a[0] === "config"), "o consentimento é liberado antes do config");
  const interno = await rodarBootstrap({ consentimento: "accepted", caminho: "/interno/fotos" });
  assert.deepEqual(interno.scripts, [], "o painel da equipe nunca carrega o gtag.js");
});

test("o layout não põe script nem conexão antecipada para Google/Meta no <head>", async () => {
  const layout = await read("app/layout.tsx");
  assert.doesNotMatch(layout, /<script[^>]*src=[^>]*googletagmanager/);
  assert.doesNotMatch(layout, /rel="(preconnect|dns-prefetch)"[^>]*(googletagmanager|google-analytics|facebook)/);
  assert.match(layout, /getGtagBootstrapScript\(\)/);
});

// A barra "Ver minha cesta" (z-index 4100) cobria o aviso de cookies (2200): o bottom dela supunha um aviso de ~76 px,
// mas ele mede de 92 a 290 px conforme a tela e o tamanho da fonte. Agora o aviso informa a própria altura em --cookie-h.
test("o aviso de cookies informa a altura em --cookie-h e as barras fixas sobem essa altura", async () => {
  const [consent, shop, produtos] = await Promise.all([
    read("app/AnalyticsConsent.tsx"),
    read("app/shop/shop.css"),
    read("app/nacoes-unidas/produtos/produtos.css"),
  ]);
  assert.match(consent, /COOKIE_HEIGHT_VAR = "--cookie-h"/);
  assert.match(consent, /new ResizeObserver\(medir\)/);
  assert.match(consent, /raiz\.style\.setProperty\(COOKIE_HEIGHT_VAR/);
  assert.match(consent, /raiz\.style\.removeProperty\(COOKIE_HEIGHT_VAR\)/, "sem aviso a variável some e as barras voltam ao lugar");
  assert.match(consent, /<section ref=\{bannerRef\} className="cookie-banner"/);
  // Toda regra que reposiciona uma barra quando o aviso aparece usa a altura medida, nunca um número fixo.
  for (const [nome, css] of [["shop.css", shop], ["produtos.css", produtos]]) {
    const regras = [...css.matchAll(/body\.cookie-banner-visible \.(barra-reserva|fluxo-rodape|produto-barra) \{ bottom: ([^;]+);/g)];
    assert.ok(regras.length >= 2, `${nome}: regras das barras com o aviso visível`);
    for (const [, barra, valor] of regras) assert.match(valor, /var\(--cookie-h, 0px\)/, `${nome}: .${barra} usa --cookie-h (achei "${valor}")`);
  }
  assert.equal([...shop.matchAll(/body\.cookie-banner-visible \.(barra-reserva|fluxo-rodape|produto-barra) \{ bottom:/g)].length, 6);
  // Sem aviso (--cookie-h ausente = 0px) o max() devolve o deslocamento de sempre.
  assert.match(shop, /body\.cookie-banner-visible \.barra-reserva \{ bottom: max\(calc\(4\.5rem \+ env\(safe-area-inset-bottom\)\), var\(--cookie-h, 0px\)\); \}/);
});

// Com fonte grande no celular o aviso passava de 1400 px de altura (texto espremido ao lado dos botões, sem quebra nem limite).
test("no celular o aviso de cookies quebra linha, tem no máximo meia tela e os botões ficam sempre à vista", async () => {
  const shop = await read("app/shop/shop.css");
  const celular = shop.slice(shop.indexOf("/* Celular: aviso de cookies em faixa baixa e fina"));
  const bloco = celular.slice(0, celular.indexOf("html body .produto-barra"));
  assert.match(bloco, /html body section\.cookie-banner \{[^}]*max-height: 50dvh !important;[^}]*overflow-y: auto !important;[^}]*flex-wrap: wrap !important;/);
  assert.match(bloco, /padding: 0\.5rem 0\.75rem calc\(0\.5rem \+ env\(safe-area-inset-bottom\)\) !important/);
  assert.match(bloco, /\.cookie-copy \{ flex: 1 1 7rem !important;/);
  assert.match(bloco, /\.cookie-actions \{[^}]*flex-wrap: wrap !important;[^}]*max-width: 100% !important;[^}]*position: sticky !important; bottom: 0 !important;/);
  assert.doesNotMatch(bloco, /max-height: none|overflow: visible/);
});

test("ao aceitar no banner, o gtag.js e o pixel são carregados; sem aceite, trackEvent não registra nada", async () => {
  const [consent, analytics] = await Promise.all([read("app/AnalyticsConsent.tsx"), read("app/analytics.ts")]);
  assert.match(consent, /appendScript\(GTAG_SCRIPT_ID, GTAG_SCRIPT_URL\)/);
  // Tudo que carrega terceiros fica dentro de startAnalytics, chamado só com consent === "accepted".
  const inicio = consent.indexOf("function startAnalytics()");
  const fim = consent.indexOf("function readStoredConsent()");
  assert.ok(inicio > 0 && fim > inicio);
  // Depois de startAnalytics (o componente em si) ninguém insere script nem liga o GTM por conta própria.
  const depois = consent.slice(fim);
  assert.ok(!depois.includes("appendScript(") && !depois.includes("startGoogleTagManager("), "nenhum script de terceiro fora de startAnalytics");
  assert.match(consent, /if \(consent === "accepted" && !interno\) startAnalytics\(\)/);
  // trackEvent sai antes de falar com o gtag quando não há aceite.
  const corpo = analytics.slice(analytics.indexOf("export function trackEvent("));
  const guarda = corpo.indexOf("if (!analyticsAutorizado(trackingWindow)) return;");
  assert.ok(guarda > 0 && guarda < corpo.indexOf('trackingWindow.gtag("event"'), "a checagem de aceite vem antes do envio");
  assert.ok(guarda < corpo.indexOf("fbq?.("), "e antes do pixel");
  assert.match(analytics, /getItem\(CONSENT_STORAGE_KEY\) === "accepted"/);
});
