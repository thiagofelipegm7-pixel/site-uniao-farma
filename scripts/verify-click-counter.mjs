#!/usr/bin/env node
// Prova do contador próprio: clique -> POST /api/cliques -> contagem no /painel-cliques.
// Uso (D1 local via miniflare; `vinext start` em Node não carrega cloudflare:workers):
//   npm run build && npx wrangler dev -c dist/server/wrangler.json --local --port 4173 \
//     --persist-to /tmp/wr-state --var PAINEL_SENHA:teste-local
//   PAINEL_SENHA=teste-local node scripts/verify-click-counter.mjs http://localhost:4173   (precisa do pacote playwright)
// Os collects do GA4 são interceptados e não chegam ao Google.
import { chromium } from "playwright";

const base = (process.argv[2] || "http://localhost:4173").replace(/\/$/, "");
const senha = process.env.PAINEL_SENHA || "";
const humanUA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
let failed = false;
const check = (ok, message) => {
  console.log(`${ok ? "OK  " : "FAIL"} ${message}`);
  if (!ok) failed = true;
};

async function panel(auth) {
  const headers = auth === undefined ? {} : { Authorization: `Basic ${Buffer.from(`x:${auth}`).toString("base64")}` };
  const response = await fetch(`${base}/painel-cliques`, { headers });
  return { status: response.status, html: await response.text(), robots: response.headers.get("x-robots-tag") };
}
const totalOf = (html) => Number(html.match(/<strong>(\d+)<\/strong><span>cliques no total/)?.[1] ?? html.match(/<strong>(\d+)<\/strong><span[^>]*>cliques no total/)?.[1] ?? -1);

const browser = await chromium.launch();
async function click(path, selector, userAgent) {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 }, ...(userAgent ? { userAgent } : {}) });
  const page = await context.newPage();
  const posts = [];
  const setCookie = [];
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/cliques")) setCookie.push((await response.allHeaders())["set-cookie"] ?? null);
  });
  page.on("request", (request) => {
    if (request.url().endsWith("/api/cliques")) {
      posts.push({ body: request.postData(), headers: request.headers() });
    }
  });
  await page.route(/\/g\/collect/, (route) => route.fulfill({ status: 204, body: "" }));
  await page.route(/wa\.me|ifood\.com\.br/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "ok" }));
  await page.goto(base + path, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.locator(selector).first().click();
  await page.waitForTimeout(2000);
  const cookies = await context.cookies();
  await context.close();
  return { posts, cookies, setCookie };
}

const noAuth = await panel();
check(noAuth.status === 401, `painel sem senha -> ${noAuth.status} (esperado 401)`);
check((await panel("errada")).status === 401, "painel com senha errada -> 401");
const before = await panel(senha);
check(before.status === 200 && /noindex/.test(before.robots ?? ""), `painel com senha -> ${before.status}, X-Robots-Tag=${before.robots}`);
const start = totalOf(before.html);

const wa = await click("/fatima", 'a[href*="wa.me"]', humanUA);
const ifood = await click("/ifood", 'a[data-track-event="ifood_click"]', humanUA);
for (const [name, result] of [["whatsapp /fatima", wa], ["ifood /ifood", ifood]]) {
  const sent = result.posts[0];
  const keys = sent ? Object.keys(JSON.parse(sent.body)).sort().join(",") : "(nenhum POST)";
  check(keys === "button,path,store", `${name}: POST /api/cliques com campos [${keys}]`);
  check(sent && !sent.headers.cookie, `${name}: sem cabeçalho Cookie`);
  check(result.setCookie.length > 0 && result.setCookie.every((value) => !value), `${name}: resposta de /api/cliques sem Set-Cookie (cookies da página, ex. idioma: ${JSON.stringify(result.cookies.map((c) => c.name))})`);
  console.log(`     corpo: ${sent?.body}`);
}

const botRun = await click("/fatima", 'a[href*="wa.me"]'); // user agent padrão do Playwright: HeadlessChrome
check(botRun.posts.length >= 1, "bot headless também envia o POST (o servidor é quem ignora)");

const after = await panel(senha);
check(totalOf(after.html) === start + 2, `painel: total ${start} -> ${totalOf(after.html)} (esperado +2; o bot HeadlessChrome não conta)`);
check(/Fátima/.test(after.html) && /Nações Unidas/.test(after.html), "painel mostra as lojas");
check(/\/ifood/.test(after.html) && /\/fatima/.test(after.html), "painel mostra as páginas");
const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
check(!sitemap.includes("painel-cliques"), "painel-cliques fora do sitemap");

await browser.close();
process.exit(failed ? 1 : 0);
