#!/usr/bin/env node
// Prova que o clique em WhatsApp e iFood gera um collect do GA4 (en=whatsapp_click / en=ifood_click).
// Uso: npx -y -p playwright node scripts/verify-ga-clicks.mjs http://localhost:4173
// Os collects são interceptados e NÃO chegam ao Google, então não sujam o GA4.
import { chromium } from "playwright";

const base = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const checks = [
  { path: "/fatima", selector: 'a[href*="wa.me"]', expected: "whatsapp_click" },
  { path: "/ifood", selector: 'a[data-track-event="ifood_click"]', expected: "ifood_click" },
];

const eventsOf = (request) => {
  const names = [];
  const fromUrl = request.url().match(/[?&]en=([^&]*)/);
  if (fromUrl) names.push(decodeURIComponent(fromUrl[1]));
  for (const line of (request.postData() || "").split("\n")) {
    const m = line.match(/(?:^|&)en=([^&]*)/);
    if (m) names.push(decodeURIComponent(m[1]));
  }
  return names;
};

const browser = await chromium.launch();
let failed = false;
for (const accepted of [false, true]) {
  for (const { path, selector, expected } of checks) {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
    if (accepted) {
      await context.addInitScript(() => localStorage.setItem("uniao_farma_cookie_consent_v1", "accepted"));
    }
    const page = await context.newPage();
    const seen = [];
    await page.route(/\/g\/collect/, async (route) => {
      const request = route.request();
      const url = request.url();
      seen.push({ events: eventsOf(request), gcs: (url.match(/gcs=([^&]*)/) || [])[1], transport: /[?&]ep\.transport_type=beacon|transport_type=beacon/.test(url + (request.postData() || "")) });
      await route.fulfill({ status: 204, body: "" });
    });
    await page.route(/wa\.me|ifood\.com\.br/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    seen.length = 0;
    await page.locator(selector).first().click();
    await page.waitForTimeout(2500);
    const hit = seen.find((s) => s.events.includes(expected));
    console.log(`${hit ? "OK  " : "FAIL"} ${path} consent=${accepted ? "aceito" : "negado"} en=${expected} gcs=${hit?.gcs ?? "-"} collects=${JSON.stringify(seen.map((s) => s.events))}`);
    if (!hit) failed = true;
    await context.close();
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
