/* eslint-disable @typescript-eslint/no-require-imports -- script de linha de comando (CommonJS) */
// Uso: node tests/shot-escala.cjs <url> <escala> <arquivo.png> [seletor-para-rolar] [digitar-na-busca]
const { chromium, devices } = require("playwright");
const [url, escalaTxt, saida, seletor, busca] = process.argv.slice(2);
const escala = Number(escalaTxt || 1);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices["Pixel 7"], viewport: { width: 360, height: 800 }, locale: "pt-BR" });
  const p = await ctx.newPage();
  await p.addInitScript((e) => {
    const feitas = new WeakSet();
    const andar = (rs) => { for (const r of rs) { if (r.cssRules && !r.style) { try { andar(r.cssRules); } catch (x) {} continue; } if (!r.style || feitas.has(r)) continue; const lh = r.style.getPropertyValue("line-height"); if (lh && /^[\d.]+(px|rem)$/.test(lh.trim())) r.style.setProperty("line-height", `calc(${lh} * ${e})`, r.style.getPropertyPriority("line-height")); const v = r.style.getPropertyValue("font-size"); if (!v || /^(inherit|initial|unset|revert|smaller|larger|small|medium|large)$/.test(v.trim()) || /^[\d.]+(em|%)$/.test(v.trim())) continue; feitas.add(r); r.style.setProperty("font-size", `calc(${v} * ${e})`, r.style.getPropertyPriority("font-size")); } };
    window.__e = () => { for (const f of document.styleSheets) { try { andar(f.cssRules); } catch (x) {} } };
    window.addEventListener("load", window.__e);
  }, escala);
  await p.goto(url); await p.waitForTimeout(1500);
  const a = p.getByText("Aceitar", { exact: true }); if (await a.count()) await a.first().click().catch(() => {});
  if (busca) { await p.locator("header input").first().click(); await p.keyboard.type(busca); await p.waitForTimeout(1200); }
  await p.evaluate(() => window.__e && window.__e()); await p.waitForTimeout(300);
  if (seletor) { await p.locator(seletor).first().scrollIntoViewIfNeeded().catch(() => {}); await p.evaluate(() => window.scrollBy(0, -120)); await p.waitForTimeout(300); }
  await p.screenshot({ path: saida });
  await b.close();
})();
