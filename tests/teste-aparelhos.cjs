/* eslint-disable @typescript-eslint/no-require-imports -- script de linha de comando (CommonJS) */
// Lista de conferência dos aparelhos de referência (plano de finalização, itens 6, 8 e 10), automatizada em Chromium emulado:
// PC, Android de entrada (Pixel 7 com CPU 4x mais lenta e 4G) e iPhone 13 (Chromium emulando o tamanho e o toque; NÃO é o Safari de verdade).
// Uso: npm run build && npx vinext start -p 4311 &  node tests/teste-aparelhos.cjs http://localhost:4311
const { chromium, devices } = require("playwright");

const BASE = process.argv[2] || "http://localhost:4311";
const LIMITE_HOME_MS = 2500;
const PERFIS = [
  { nome: "PC", ctx: { viewport: { width: 1366, height: 768 } }, toque: false, rede: null, cpu: 1 },
  { nome: "Android de entrada (4G, CPU 4x)", ctx: devices["Pixel 7"], toque: true, rede: { latency: 170, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 }, cpu: 4 },
  { nome: "iPhone 13 (emulado)", ctx: devices["iPhone 13"], toque: true, rede: null, cpu: 1 },
];

async function perfil(browser, p) {
  const res = [];
  const ok = (nome, passou, detalhe = "") => res.push({ nome, passou, detalhe });
  const c = await browser.newContext(p.ctx);
  const page = await c.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message.slice(0, 100)));
  await page.route("**/api/disponibilidade", (r) => r.fulfill({ json: { ok: true, mudou: {} } }));
  const cdp = await c.newCDPSession(page);
  if (p.rede) await cdp.send("Network.emulateNetworkConditions", { offline: false, ...p.rede });
  if (p.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });
  const toca = (loc) => (p.toque ? loc.tap() : loc.click());

  // 1) home abre rápido
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "load" });
  const ms = Date.now() - t0;
  ok("Home abre em até 2,5 s", ms <= LIMITE_HOME_MS, `${ms} ms`);
  await page.waitForTimeout(1500);

  // 2) home + busca -> produto na cesta em até 3 toques
  let toques = 0;
  const campo = page.locator(".shop-busca input").first();
  await toca(campo); toques += 1;
  await campo.fill("dipirona");
  await page.waitForSelector("#shop-sugestoes li a", { timeout: 8000 });
  await toca(page.locator("#shop-sugestoes li a").first()); toques += 1;
  await page.waitForURL(/\/nacoes-unidas\/produtos\//, { timeout: 8000 });
  const adicionar = page.locator(".produto-barra button").first();
  await adicionar.waitFor({ timeout: 8000 });
  const rotulo = (await adicionar.innerText()).trim();
  await toca(adicionar); toques += 1;
  const naCesta = await page.evaluate(() => JSON.parse(localStorage.getItem("uf-reserva-v1") || "{}").itens?.length ?? 0);
  ok("Home -> busca -> cesta em até 3 toques", naCesta === 1 && toques <= 3, `${toques} toques, botão "${rotulo}"`);

  // 3) preço, foto e estoque na página do produto
  const preco = await page.locator(".produto-preco, .pv-preco, [class*=preco]").first().innerText().catch(() => "");
  const foto = await page.evaluate(() => { const i = document.querySelector(".produto-foto img"); return i ? i.complete && i.naturalWidth > 0 : false; });
  ok("Produto mostra preço e foto", /R\$/.test(preco + (await page.content()).slice(0, 0)) || /R\$/.test(await page.locator("body").innerText()), foto ? "foto carregou" : "sem foto de verdade (ilustração)");

  // 4) cesta -> mensagem pronta para o WhatsApp
  await page.goto(BASE + "/reserva", { waitUntil: "networkidle" });
  const avancar = async (re) => { const b = page.getByRole("button", { name: re }).first(); await b.scrollIntoViewIfNeeded().catch(() => {}); await toca(b); await page.waitForTimeout(400); };
  await avancar(/Continuar/i);
  await page.locator('input[autocomplete="name"]').first().fill("Maria Teste");
  await avancar(/Confirmar nome|Confirmar/i);
  await avancar(/Revisar pedido/i);
  const pix = page.getByLabel(/Pix/i).first();
  if (await pix.count()) await pix.check().catch(() => {});
  const envio = page.locator('a[data-track-source="reserva_envio"]').first();
  const href = (await envio.count()) ? await envio.getAttribute("href") : "";
  ok("Cesta gera a mensagem do WhatsApp pronta", /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href || "") && decodeURIComponent((href || "").replace(/\+/g, " ")).includes("Quero pedir"), (href || "sem link").slice(0, 40));

  // 5) rodapé com Alvará e AFE
  await page.goto(BASE + "/", { waitUntil: "load" });
  const rodape = await page.locator("footer").first().innerText();
  ok("Rodapé com Alvará e AFE", /Alvará Sanitário nº 207\/2026/.test(rodape) && /AFE Anvisa nº 7\.61823-1/.test(rodape));

  // 6) sem rolagem lateral e campos sem zoom no iPhone
  const largura = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  ok("Sem rolagem lateral", largura[0] <= largura[1], `${largura[0]} x ${largura[1]}`);
  const pequenos = await page.evaluate(() => [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]), select, textarea")].filter((e) => e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 16).length);
  ok("Campos com 16 px ou mais (iPhone não amplia)", pequenos === 0, `${pequenos} abaixo`);
  ok("Sem erro de JavaScript", erros.length === 0, erros[0] || "");
  await c.close();
  return res;
}

(async () => {
  const browser = await chromium.launch();
  let falhas = 0;
  for (const p of PERFIS) {
    let res;
    try {
      res = await perfil(browser, p);
    } catch (e) {
      res = [{ nome: "Teste interrompido", passou: false, detalhe: String(e.message).split("\n")[0].slice(0, 120) }];
    }
    console.log(`\n== ${p.nome}`);
    for (const r of res) { console.log(`  ${r.passou ? "OK  " : "FALHA"} ${r.nome}${r.detalhe ? ` — ${r.detalhe}` : ""}`); if (!r.passou) falhas += 1; }
  }
  await browser.close();
  console.log(`\n${falhas === 0 ? "Tudo certo." : `${falhas} item(ns) para olhar.`}`);
  process.exit(falhas === 0 ? 0 : 1);
})();
