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
