/* eslint-disable @typescript-eslint/no-require-imports -- script de linha de comando (CommonJS) */
/**
 * Auditoria: procura texto que passa da própria caixa (botões, selos, cartões) ou da tela, no celular com letra ampliada.
 * Uso: node tests/audit-texto-mobile.cjs http://localhost:4250 [escalas separadas por vírgula, ex.: 1,1.3,1.5]
 * Simula o "tamanho da fonte" do Android multiplicando o tamanho de todo texto (as caixas não crescem junto).
 */
const { chromium, devices } = require("playwright");
const BASE = process.argv[2] || "http://localhost:4250";
const ESCALAS = (process.argv[3] || "1,1.3,1.5").split(",").map(Number);
const LARGURA = Number(process.argv[4] || 360);
const MODO = process.argv[5] || "pedido"; // "pedido" (fluxo da compra) ou "site" (todas as páginas e janelas)

function instalar(escala) {
  // Simula o "tamanho da fonte" do Android: cada regra de CSS com font-size passa a valer `calc(original * escala)`.
  // (Mexer em style inline não serve: regras com !important dentro de @layer vencem o inline.)
  const feitas = new WeakSet();
  const andar = (regras) => {
    for (const r of regras) {
      if (r.cssRules && !r.style) { try { andar(r.cssRules); } catch (e) { /* folha de outro domínio */ } continue; }
      if (!r.style || feitas.has(r)) continue;
      const lh = r.style.getPropertyValue("line-height");
      if (lh && /^[\d.]+(px|rem)$/.test(lh.trim())) r.style.setProperty("line-height", `calc(${lh} * ${escala})`, r.style.getPropertyPriority("line-height"));
      const v = r.style.getPropertyValue("font-size");
      if (!v || /^(inherit|initial|unset|revert|smaller|larger|xx?-(small|large)|small|medium|large)$/.test(v.trim())) continue;
      if (/^[\d.]+(em|%)$/.test(v.trim())) continue; // relativo ao pai: já acompanha
      feitas.add(r);
      r.style.setProperty("font-size", `calc(${v} * ${escala})`, r.style.getPropertyPriority("font-size"));
    }
  };
  window.__ufEscalar = () => {
    if (escala === 1) return;
    for (const folha of document.styleSheets) { try { andar(folha.cssRules); } catch (e) { /* ignora */ } }
    for (const el of document.querySelectorAll("[style*='font-size']")) {
      if (el.dataset.ufEscala) continue;
      el.dataset.ufEscala = "1";
      el.style.setProperty("font-size", `calc(${el.style.fontSize} * ${escala})`, "important");
    }
  };
  document.addEventListener("DOMContentLoaded", window.__ufEscalar);
  window.addEventListener("load", window.__ufEscalar);
}

function auditar() {
  const achados = [];
  const vw = window.innerWidth;
  const caixa = (el) => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor;
    const comFundo = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    const comBorda = ["Top", "Right", "Bottom", "Left"].some((l) => parseFloat(cs[`border${l}Width`]) > 0 && cs[`border${l}Style`] !== "none");
    return comFundo || comBorda || el.tagName === "BUTTON" || el.tagName === "INPUT";
  };
  const emRolagem = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === "auto" || o === "scroll") return true;
    }
    return false;
  };
  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Texto só para leitor de tela (caixa de 1 px) e títulos de tabela escondidos não contam.
    if (typeof el.checkVisibility === "function" && !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true, opacityProperty: true })) return false;
    if (el.closest("details:not([open])") && !el.closest("summary")) return false;
    return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0" && !/sr-only|visually-hidden/.test(String(el.className));
  };
  const rotulo = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
  for (const el of document.querySelectorAll("body *")) {
    if (!visivel(el)) continue;
    const nos = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (nos.length === 0) continue;
    const r = el.getBoundingClientRect();
    // Cabeçalho de tabela escondido para leitor de tela (thead de 1 px) e texto com reticências propositais não contam.
    const escondido = el.closest("thead");
    if (escondido && escondido.getBoundingClientRect().width <= 2) continue;
    if (getComputedStyle(el).overflowX === "hidden" && getComputedStyle(el).textOverflow === "ellipsis") continue;
    const range = document.createRange();
    let esq = Infinity, dir = -Infinity;
    for (const n of nos) {
      range.selectNodeContents(n);
      for (const t of range.getClientRects()) {
        if (t.width === 0) continue;
        esq = Math.min(esq, t.left);
        dir = Math.max(dir, t.right);
      }
    }
    if (!isFinite(esq)) continue;
    const texto = nos.map((n) => n.textContent.trim()).join(" ").slice(0, 40);
    const cs = getComputedStyle(el);
    const cortado = cs.overflowX === "hidden" && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== "ellipsis" && !cs.webkitLineClamp?.match(/\d/) && cs.getPropertyValue("-webkit-line-clamp") === "none";
    if (caixa(el) && (dir > r.right + 1 || esq < r.left - 1)) achados.push({ tipo: "passa da caixa", el: rotulo(el), texto, sobra: Math.round(Math.max(dir - r.right, r.left - esq)) });
    else if (cortado) achados.push({ tipo: "cortado", el: rotulo(el), texto, sobra: el.scrollWidth - el.clientWidth });
    else if (!emRolagem(el) && (dir > vw + 1 || esq < -1)) achados.push({ tipo: "fora da tela", el: rotulo(el), texto, sobra: Math.round(Math.max(dir - vw, -esq)) });
  }
  // Texto cortado por um ancestral com overflow oculto (ex.: a pílula "Para você" ou um cartão com altura/largura fixas).
  const textosVisiveis = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visivel(el)) continue;
    const nos = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (nos.length === 0) continue;
    const range = document.createRange();
    let esq = Infinity, dir = -Infinity, topo = Infinity, base = -Infinity;
    for (const n of nos) {
      range.selectNodeContents(n);
      for (const t of range.getClientRects()) {
        if (t.width === 0 || t.height === 0) continue;
        esq = Math.min(esq, t.left); dir = Math.max(dir, t.right); topo = Math.min(topo, t.top); base = Math.max(base, t.bottom);
      }
    }
    if (!isFinite(esq)) continue;
    const texto = nos.map((n) => n.textContent.trim()).join(" ").slice(0, 40);
    textosVisiveis.push({ el, esq, dir, topo, base, texto });
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== "hidden" && cs.overflowX !== "clip") continue;
      if (cs.textOverflow === "ellipsis") break;
      const ar = a.getBoundingClientRect();
      if (ar.width <= 2) break;
      if (dir > ar.right + 2 || esq < ar.left - 2) { achados.push({ tipo: "cortado por " + rotulo(a), el: rotulo(el), texto, sobra: Math.round(Math.max(dir - ar.right, ar.left - esq)) }); break; }
    }
  }
  // Linhas de texto de elementos diferentes uma em cima da outra (ex.: rótulos do menu de baixo se encostando, logo sob um ícone).
  // Compara linha a linha (não a caixa do parágrafo inteiro) e só o que está realmente visível no topo da tela (não coberto por janela).
  const linhas = [];
  for (const T of textosVisiveis) {
    const range = document.createRange();
    for (const n of [...T.el.childNodes].filter((x) => x.nodeType === 3 && x.textContent.trim())) {
      range.selectNodeContents(n);
      for (const t of range.getClientRects()) {
        if (t.width < 4 || t.height < 4 || t.bottom < 0 || t.top > window.innerHeight * 6) continue;
        linhas.push({ el: T.el, texto: T.texto, esq: t.left, dir: t.right, topo: t.top, base: t.bottom });
      }
    }
  }
  const noTopo = (L) => {
    const alvo = document.elementFromPoint(Math.min(Math.max((L.esq + L.dir) / 2, 0), window.innerWidth - 1), Math.min(Math.max((L.topo + L.base) / 2, 0), window.innerHeight - 1));
    return !!alvo && (alvo === L.el || L.el.contains(alvo) || alvo.contains(L.el));
  };
  const jaVistos = new Set();
  const fixo = (el) => { for (let a = el; a && a !== document.body; a = a.parentElement) { const pos = getComputedStyle(a).position; if (pos === "fixed" || pos === "sticky") return true; } return false; };
  for (let i = 0; i < linhas.length; i += 1) {
    if (window.__ufSemSobreposicao) break;
    for (let j = i + 1; j < linhas.length; j += 1) {
      const A = linhas[i], B = linhas[j];
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
      if (fixo(A.el) !== fixo(B.el)) continue; // página rolando por baixo do cabeçalho/menu fixo: normal
      const w = Math.min(A.dir, B.dir) - Math.max(A.esq, B.esq);
      const h = Math.min(A.base, B.base) - Math.max(A.topo, B.topo);
      if (w <= 3 || h <= 3) continue;
      const menor = Math.min((A.dir - A.esq) * (A.base - A.topo), (B.dir - B.esq) * (B.base - B.topo));
      if ((w * h) / menor <= 0.3) continue;
      const chave = rotulo(A.el) + "|" + rotulo(B.el);
      if (jaVistos.has(chave)) continue;
      // Só conta se as duas linhas estão na parte visível da tela agora (o resto da página pode estar sob outra camada).
      if (A.topo < 0 || A.base > window.innerHeight || B.topo < 0 || B.base > window.innerHeight) continue;
      if (!noTopo(A) || !noTopo(B)) continue;
      jaVistos.add(chave);
      achados.push({ tipo: "texto em cima de texto", el: rotulo(A.el) + " × " + rotulo(B.el), texto: A.texto + " / " + B.texto, sobra: Math.round(w) });
    }
  }
  if (document.documentElement.scrollWidth > vw + 1) achados.push({ tipo: "rolagem horizontal da página", el: "html", texto: "", sobra: document.documentElement.scrollWidth - vw });
  return achados;
}

async function aceitar(p) {
  const a = p.getByText("Aceitar", { exact: true });
  if (await a.count()) await a.first().click().catch(() => {});
}

(async () => {
  const b = await chromium.launch();
  const resumo = new Map();
  for (const escala of ESCALAS) {
    const ctx = await b.newContext({ ...devices["Pixel 7"], viewport: { width: LARGURA, height: 800 }, locale: "pt-BR" });
    const p = await ctx.newPage();
    await p.addInitScript(instalar, escala);
    const olhar = async (nome, sobreposicao = true) => {
      await p.evaluate((v) => { window.__ufSemSobreposicao = !v; }, sobreposicao);
      await p.waitForTimeout(700);
      await p.evaluate(() => window.__ufEscalar && window.__ufEscalar());
      await p.waitForTimeout(150);
      // Percorre a página de cima a baixo: o teste de "texto em cima de texto" só olha o que está na tela.
      const altura = await p.evaluate(() => document.documentElement.scrollHeight);
      const passo = 600;
      let lista = [];
      for (let y = 0; y < Math.min(altura, passo * 14); y += passo) {
        await p.evaluate((yy) => window.scrollTo(0, yy), y);
        await p.waitForTimeout(60);
        lista = lista.concat(await p.evaluate(auditar));
      }
      await p.evaluate(() => window.scrollTo(0, 0));
      for (const a of lista) {
        const chave = `${a.tipo}|${a.el}|${a.texto}`;
        const antes = resumo.get(chave);
        if (!antes) resumo.set(chave, { ...a, telas: new Set([`${nome}@${escala}`]) });
        else antes.telas.add(`${nome}@${escala}`);
      }
    };
    if (MODO === "site") {
      const mapa = await (await ctx.request.get(`${BASE}/sitemap.xml`)).text();
      const rotas = new Set([...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
      for (const extra of ["/", "/reserva", "/nacoes-unidas/produtos", "/nacoes-unidas/produtos/receita", "/nacoes-unidas/produtos/controlados", "/nacoes-unidas/produtos/acetona-ideal-100-ml", "/unidades/nacoes-unidas", "/whatsapp", "/privacidade", "/termos", "/institucional", "/perguntas", "/ofertas", "/encarte"]) rotas.add(extra);
      console.log(`[site] ${rotas.size} rotas, fonte x${escala}`);
      let primeira = true;
      for (const rota of rotas) {
        if (/\.(xml|txt|json)$/.test(rota)) continue;
        await p.goto(`${BASE}${rota}`, { waitUntil: "load" }).catch(() => {});
        await p.waitForTimeout(900);
        if (primeira) { await aceitar(p); primeira = false; }
        await olhar(rota);
      }
      // Janelas e painéis que abrem por toque
      await p.goto(`${BASE}/`); await p.waitForTimeout(1000);
      const tocar = async (nome, loc) => { const n = await loc.count().catch(() => 0); if (!n) return; await loc.first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(700); await olhar(nome, false); await p.keyboard.press("Escape").catch(() => {}); };
      await tocar("menu (hambúrguer)", p.getByRole("button", { name: /menu|departamentos/i }));
      await p.goto(`${BASE}/`); await p.waitForTimeout(800);
      await p.locator("header input").first().click(); await p.keyboard.type("dipir"); await p.waitForTimeout(1200); await olhar("busca com sugestões", false);
      await p.goto(`${BASE}/nacoes-unidas/produtos?q=dipirona`); await p.waitForTimeout(2000);
      await tocar("filtrar", p.getByRole("button", { name: /Filtrar/ }));
      await tocar("receita por foto", p.getByRole("button", { name: /Tenho uma receita/ }).or(p.getByText("Tenho uma receita")));
      await p.locator(".pv-cesta-botao").first().click(); await p.waitForTimeout(400);
      await tocar("gaveta da cesta", p.getByRole("button", { name: /Minha cesta/ }));
      await p.goto(`${BASE}/departamentos/medicamentos`); await p.waitForTimeout(2500);
      await tocar("abas de medicamentos", p.getByRole("tab", { name: /Controlados/ }));
      await ctx.close();
      continue;
    }
    await p.goto(`${BASE}/`); await p.waitForTimeout(1200); await aceitar(p); await olhar("home");
    await p.goto(`${BASE}/nacoes-unidas/produtos?q=dipirona`); await p.waitForTimeout(2200); await olhar("lista");
    await p.locator(".pv-cesta-botao").first().click(); await p.waitForTimeout(500); await olhar("lista com item");
    await p.goto(`${BASE}/nacoes-unidas/produtos/acetona-ideal-100-ml`); await p.waitForTimeout(1200); await olhar("produto");
    await p.goto(`${BASE}/reserva`); await p.waitForTimeout(1500); await olhar("cesta");
    await p.getByRole("button", { name: /Continuar: entrega ou retirada/ }).first().click(); await p.waitForTimeout(800); await olhar("entrega-retirada");
    await p.getByText("Entrega no seu bairro").first().click(); await p.waitForTimeout(500); await olhar("entrega-casa");
    await p.getByPlaceholder(/Nome completo/).fill("Maria Aparecida dos Santos Oliveira");
    await p.locator("select").first().selectOption({ index: 6 });
    await p.getByPlaceholder(/Ex.: Rua Inglaterra/).fill("162 Inglaterra, Casa dos fundos");
    await olhar("entrega-casa preenchida");
    await p.getByRole("button", { name: /Revisar pedido/ }).first().click(); await p.waitForTimeout(800); await olhar("finalizar entrega");
    await p.getByText("Pix", { exact: true }).first().click(); await p.waitForTimeout(400); await olhar("finalizar pix");
    await p.getByRole("link", { name: /Enviar pedido pelo WhatsApp/ }).first().evaluate((a) => { a.removeAttribute("target"); a.addEventListener("click", (e) => e.preventDefault()); });
    await p.getByRole("link", { name: /Enviar pedido pelo WhatsApp/ }).first().click(); await p.waitForTimeout(500); await olhar("finalizar depois de enviar");
    await p.goto(`${BASE}/entrega-de-medicamentos-em-sabara`); await p.waitForTimeout(1200); await olhar("entrega-bairros");
    await p.goto(`${BASE}/departamentos/medicamentos`); await p.waitForTimeout(2500); await olhar("departamento");
    await ctx.close();
  }
  await b.close();
  const todos = [...resumo.values()].sort((x, y) => y.sobra - x.sobra);
  if (todos.length === 0) console.log("Nenhum texto passando da caixa.");
  for (const a of todos) console.log(`${a.tipo} | ${a.el} | "${a.texto}" | sobra ${a.sobra}px | ${[...a.telas].slice(0, 4).join(", ")}`);
  console.log(`\nTotal: ${todos.length}`);
  process.exit(todos.length ? 1 : 0);
})();
