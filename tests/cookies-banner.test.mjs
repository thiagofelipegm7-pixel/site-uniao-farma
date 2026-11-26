import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("cookies: o banner é amigável, o recusar continua visível e a lógica do aceite não muda", async () => {
  const [consent, bootstrap] = await Promise.all([
    ler("app/AnalyticsConsent.tsx"),
    ler("app/ga-bootstrap.ts"),
  ]);

  assert.match(consent, /Podemos usar cookies\?/);
  assert.match(consent, /Eles nos ajudam a melhorar o site\. Você escolhe\./);
  assert.match(consent, /<a href="\/privacidade">Privacidade<\/a>/);
  assert.match(consent, /className="cookie-accept"[\s\S]*Aceitar e continuar/);
  assert.match(consent, /className="cookie-reject"[\s\S]*Só os necessários/);
  assert.match(consent, /onClick=\{\(\) => saveConsent\("accepted"\)\}/);
  assert.match(consent, /onClick=\{\(\) => saveConsent\("rejected"\)\}/);
  assert.doesNotMatch(consent, /type="checkbox"/);
  assert.doesNotMatch(consent, /Você precisa aceitar|Sem cookies o site não funciona|não vai funcionar/i);
  assert.match(bootstrap, /uniao_farma_cookie_consent_v1/);
  assert.match(consent, /CONSENT_KEY/);
  const inicio = consent.indexOf("function startAnalytics()");
  const fim = consent.indexOf("function readStoredConsent()");
  assert.ok(inicio > 0 && fim > inicio);
  const dentro = consent.slice(inicio, fim);
  assert.match(dentro, /agendarClarity/);
  assert.match(dentro, /GTAG_SCRIPT_URL|gtag/);
});

test("cookies: o Aceitar usa a cor da farmácia, tem 44px e o Recusar não some", async () => {
  const [shop, globals, base, home] = await Promise.all([
    ler("app/shop/shop.css"),
    ler("app/globals.css"),
    ler("app/base-direcao.css"),
    ler("app/home-direcao.css"),
  ]);
  assert.match(globals, /\.cookie-accept \{ background: #086f66; border-color: #086f66; \}/);
  assert.match(shop, /min-height: 2\.75rem !important/);
  assert.match(shop, /min-width: 44px !important/);
  assert.match(shop, /@keyframes cookie-banner-entrar/);
  assert.match(shop, /prefers-reduced-motion: reduce/);
  for (const css of [shop, base, home]) {
    assert.match(css, /#086f66/);
    assert.doesNotMatch(css, /html body[^{]*cookie-accept[^{]*\{[^}]*background:\s*#000000/s);
    assert.doesNotMatch(css, /\.cookie-reject[^{]*\{[^}]*(?:display:\s*none|visibility:\s*hidden|opacity:\s*0)/s);
  }
});
