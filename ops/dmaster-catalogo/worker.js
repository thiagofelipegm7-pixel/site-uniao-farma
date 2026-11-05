// dmaster-catalogo: stores the latest product catalog (uploaded from the pharmacy terminal) in KV
// and serves it to authorized readers.
//   GET  /            -> "ok"
//   POST /upload      -> Bearer UPLOAD_TOKEN, full replace {loja, geradoEm, itens:[...]} (manual / bootstrap)
//   POST /delta       -> Bearer UPLOAD_TOKEN, merge {loja, geradoEm, mudancas:[...], removidos?:[codigo]}
//   POST /heartbeat   -> Bearer UPLOAD_TOKEN, tiny {loja} — marks PC alive without touching itens
//   GET  /catalogo    -> Bearer READ_TOKEN, ?loja=itacolomi; returns geradoEm (last content),
//                        recebidoEm (last contact: upload/delta/heartbeat), batimentoEm, mudancaEm
//   GET  /loja/nacoes -> PUBLIC prescription-free catalog page (noindex, 5 min cache)
// Vars: EXCLUDE_CLASSES (comma-separated Classe names to hide from ?ofertavel=1; empty for now).

const enc = new TextEncoder();
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function safeEqual(a, b) {
  if (!a || !b) return false;
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha), y = new Uint8Array(hb);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

async function authorized(request, secret) {
  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") || "");
  return !!m && (await safeEqual(m[1].trim(), secret || ""));
}

async function gunzip(buf) {
  const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function gzip(buf) {
  const s = new Blob([buf]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
const isGzip = (b) => b.length > 2 && b[0] === 0x1f && b[1] === 0x8b;

const lojaKey = (loja) => `catalogo:${loja}`;
const validLoja = (s) => typeof s === "string" && /^[a-z0-9_-]{1,40}$/i.test(s);

const truthy = (v) => {
  if (v === true || v === 1) return true;
  if (typeof v === "string") return ["1", "s", "sim", "true", "t", "y", "yes", "x"].includes(v.trim().toLowerCase());
  return false;
};

export function ofertavel(item, excludeClasses) {
  if (truthy(item.ProdutoControlado)) return false;
  if (truthy(item.ProdutoAntimicrobiano)) return false;
  if (!(Number(item.Estoque) > 0)) return false;
  const cls = String(item.Classe ?? "").trim().toLowerCase();
  if (cls && excludeClasses.has(cls)) return false;
  return true;
}

async function upload(request, env) {
  if (!(await authorized(request, env.UPLOAD_TOKEN))) return json({ error: "unauthorized" }, 401);
  let bytes = new Uint8Array(await request.arrayBuffer());
  try {
    if (isGzip(bytes)) bytes = await gunzip(bytes);
  } catch {
    return json({ error: "bad_gzip" }, 400);
  }
  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const loja = data?.loja;
  if (!validLoja(loja) || !Array.isArray(data.itens)) return json({ error: "invalid_payload", hint: "need loja and itens[]" }, 400);
  const agora = new Date().toISOString();
  const stored = {
    loja,
    geradoEm: data.geradoEm ?? null,
    recebidoEm: agora,
    batimentoEm: agora,
    mudancaEm: agora,
    total: data.itens.length,
    itens: data.itens,
  };
  await gravarCatalogo(env, loja, stored);
  return json({ ok: true, loja, total: stored.total, recebidoEm: stored.recebidoEm, modo: "completo" });
}

async function lerCatalogo(env, loja) {
  const gz = await env.CATALOGO.get(lojaKey(loja), "arrayBuffer");
  if (!gz) return null;
  return JSON.parse(new TextDecoder().decode(await gunzip(new Uint8Array(gz))));
}

async function gravarCatalogo(env, loja, stored) {
  const gz = await gzip(enc.encode(JSON.stringify(stored)));
  await env.CATALOGO.put(lojaKey(loja.toLowerCase()), gz, {
    metadata: {
      geradoEm: stored.geradoEm,
      recebidoEm: stored.recebidoEm,
      batimentoEm: stored.batimentoEm,
      mudancaEm: stored.mudancaEm,
      total: stored.total,
    },
  });
  // Páginas públicas em cache: invalidar após mudança de conteúdo.
  await Promise.all([env.CATALOGO.delete("html:nacoes"), env.CATALOGO.delete("json:nacoes")]);
}

const codigoDe = (it) => String(it?.CodigoDeBarras ?? "").trim();

/** Mescla mudanças por código de barras. Recusa se o total cair demais (mesmo critério do site: >20%). */
async function delta(request, env) {
  if (!(await authorized(request, env.UPLOAD_TOKEN))) return json({ error: "unauthorized" }, 401);
  let bytes = new Uint8Array(await request.arrayBuffer());
  try {
    if (isGzip(bytes)) bytes = await gunzip(bytes);
  } catch {
    return json({ error: "bad_gzip" }, 400);
  }
  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const loja = data?.loja;
  if (!validLoja(loja) || !Array.isArray(data.mudancas)) return json({ error: "invalid_payload", hint: "need loja and mudancas[]" }, 400);
  const atual = await lerCatalogo(env, loja.toLowerCase());
  if (!atual || !Array.isArray(atual.itens) || atual.itens.length === 0) {
    return json({ error: "sem_base", hint: "envie um /upload completo antes do primeiro delta" }, 409);
  }
  // Cópia da lista: preserva linhas com o mesmo código (o Map colapsava e perdia ~60 itens).
  const itens = atual.itens.slice();
  const indice = () => {
    const m = new Map();
    for (let i = 0; i < itens.length; i++) {
      const c = codigoDe(itens[i]);
      if (c && !m.has(c)) m.set(c, i);
    }
    return m;
  };
  const antes = itens.length;
  const removidos = Array.isArray(data.removidos) ? data.removidos.map((c) => String(c).trim()).filter(Boolean) : [];
  if (removidos.length) {
    const tira = new Set(removidos);
    for (let i = itens.length - 1; i >= 0; i--) {
      if (tira.has(codigoDe(itens[i]))) itens.splice(i, 1);
    }
  }
  let by = indice();
  let aplicados = 0;
  for (const it of data.mudancas) {
    if (!it || typeof it !== "object") continue;
    const c = codigoDe(it);
    if (!c || c.length < 4) continue;
    if (!("Produto" in it) || !("Pvenda" in it) || !("Estoque" in it) || !("Classe" in it)) {
      return json({ error: "item_incompleto", codigo: c }, 400);
    }
    if (by.has(c)) itens[by.get(c)] = it;
    else {
      by.set(c, itens.length);
      itens.push(it);
    }
    aplicados += 1;
  }
  const depois = itens.length;
  if (antes > 0 && depois < antes * 0.8) {
    return json({ error: "queda_excessiva", antes, depois, hint: "delta cairia >20% dos itens; use /upload completo se for consciente" }, 422);
  }
  if (depois < 1000) {
    return json({ error: "total_baixo", depois, hint: "mínimo 1000 itens após o merge" }, 422);
  }
  const agora = new Date().toISOString();
  const stored = {
    loja: loja.toLowerCase() === String(atual.loja).toLowerCase() ? atual.loja : loja,
    geradoEm: data.geradoEm ?? atual.geradoEm ?? null,
    recebidoEm: agora,
    batimentoEm: agora,
    mudancaEm: agora,
    total: depois,
    itens,
  };
  await gravarCatalogo(env, loja, stored);
  return json({
    ok: true,
    loja: stored.loja,
    total: stored.total,
    aplicados,
    removidos: removidos.length,
    recebidoEm: stored.recebidoEm,
    modo: "delta",
  });
}

/** Marca o PC vivo sem alterar o catálogo. */
async function heartbeat(request, env) {
  if (!(await authorized(request, env.UPLOAD_TOKEN))) return json({ error: "unauthorized" }, 401);
  let data = {};
  try {
    const raw = await request.text();
    if (raw) data = JSON.parse(raw);
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const loja = data?.loja || "itacolomi";
  if (!validLoja(loja)) return json({ error: "invalid_payload" }, 400);
  const atual = await lerCatalogo(env, loja.toLowerCase());
  if (!atual) return json({ error: "sem_base", hint: "envie um /upload completo antes" }, 409);
  const agora = new Date().toISOString();
  atual.recebidoEm = agora;
  atual.batimentoEm = agora;
  // Não mexe em geradoEm/mudancaEm/itens — só o pulso.
  const gz = await gzip(enc.encode(JSON.stringify(atual)));
  await env.CATALOGO.put(lojaKey(loja.toLowerCase()), gz, {
    metadata: {
      geradoEm: atual.geradoEm,
      recebidoEm: atual.recebidoEm,
      batimentoEm: atual.batimentoEm,
      mudancaEm: atual.mudancaEm ?? null,
      total: atual.total,
    },
  });
  return json({ ok: true, loja, recebidoEm: agora, batimentoEm: agora, modo: "batimento" });
}

async function catalogo(request, env, url) {
  if (!(await authorized(request, env.READ_TOKEN))) return json({ error: "unauthorized" }, 401);
  const loja = (url.searchParams.get("loja") || "itacolomi").toLowerCase();
  if (!validLoja(loja)) return json({ error: "invalid_loja" }, 400);
  const gz = await env.CATALOGO.get(lojaKey(loja), "arrayBuffer");
  if (!gz) return json({ error: "not_found", loja }, 404);
  const semreceita = url.searchParams.get("semreceita") === "1";
  if (url.searchParams.get("ofertavel") !== "1" && !semreceita) {
    // No parsing: stream the stored JSON straight back.
    const body = new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
  const data = JSON.parse(new TextDecoder().decode(await gunzip(new Uint8Array(gz))));
  const exclude = new Set(String(env.EXCLUDE_CLASSES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  let itens = data.itens.filter((i) => ofertavel(i, exclude));
  if (!semreceita) return json({ ...data, filtro: "ofertavel", totalOriginal: data.total, total: itens.length, itens });
  // semreceita=1: only barcodes on the approved allowlist (livre/MIP), AND still ofertavel (stock, not controlled/antimicrobial).
  const raw = await env.CATALOGO.get(allowKey(loja));
  if (!raw) return json({ error: "allowlist_missing", loja }, 409);
  const allow = new Set(JSON.parse(raw).map((c) => String(c).trim()));
  itens = itens.filter((i) => {
    const c = String(i.CodigoDeBarras ?? "").trim();
    return c.length >= 6 && allow.has(c);
  });
  return json({ ...data, filtro: "semreceita", totalOriginal: data.total, total: itens.length, itens });
}

const allowKey = (loja) => `allowlist:${loja}`;
const mipKey = (loja) => `mip:${loja}`;

async function allowlist(request, env) {
  if (!(await authorized(request, env.UPLOAD_TOKEN))) return json({ error: "unauthorized" }, 401);
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const loja = String(data?.loja || "").toLowerCase();
  if (!validLoja(loja) || !Array.isArray(data.codigos)) return json({ error: "invalid_payload", hint: "need loja and codigos[]" }, 400);
  const codigos = [...new Set(data.codigos.map((c) => String(c).trim()).filter((c) => c.length >= 6))];
  await env.CATALOGO.put(allowKey(loja), JSON.stringify(codigos));
  let mipTotal;
  if (Array.isArray(data.mip)) {
    const mip = [...new Set(data.mip.map((c) => String(c).trim()).filter((c) => c.length >= 6))];
    await env.CATALOGO.put(mipKey(loja), JSON.stringify(mip));
    mipTotal = mip.length;
  }
  return json({ ok: true, loja, total: codigos.length, mip: mipTotal });
}

// Public prescription-free catalog page renderer (Drogaria União Farma - Nações Unidas; os dados vêm das chaves KV *:itacolomi gravadas pela tarefa do Windows). Server-side HTML, no external deps.
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (n) => "R$ " + Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

const CAT_MED = "Medicamentos isentos de prescrição";
const CAT_PERF = "Perfumaria e higiene";
const CAT_SUP = "Suplementos e alimentos";
const CAT_COR = "Correlatos e outros";
const CAT_PELE = "Pele e proteção solar";
const ORDER = [CAT_PERF, CAT_PELE, CAT_SUP, CAT_COR, CAT_MED];

function categoria(item, isMip) {
  if (isMip) return CAT_MED;
  const c = String(item.Classe ?? "").trim().toUpperCase();
  if (c === "SUPLEMENTOS" || c === "ALIMENTOS") return CAT_SUP;
  if (c === "PERFUMARIA" || c === "KIT DE PRODUTOS" || c === "SERVICOS") return CAT_PERF;
  return CAT_COR;
}

const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function renderLoja(itens, mipSet, geradoEm, waNumero, catMap) {
  const wa = String(waNumero || "").replace(/\D/g, ""); // vazio = sem botão de WhatsApp
  const rows = itens
    .map((i) => {
      const code = String(i.CodigoDeBarras ?? "").trim();
      const mip = mipSet.has(code);
      return { nome: String(i.Produto ?? "").replace(/\s+/g, " ").trim(), apres: String(i.Apresentacao ?? "").trim(), lab: String(i.Laboratorio ?? "").trim(), preco: Number(i.Pvenda), mip, cat: (catMap && catMap[String(i.CodigoDeBarras ?? "").trim()]) || categoria(i, mip) };
    })
    .filter((r) => r.nome && Number.isFinite(r.preco) && r.preco > 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const counts = {};
  for (const r of rows) counts[r.cat] = (counts[r.cat] || 0) + 1;
  const cats = ORDER.filter((c) => counts[c]);

  const cards = rows
    .map((r) => {
      const lab = r.lab && !/^diversos$/i.test(r.lab) ? esc(r.lab) : "";
      const sub = [r.apres, lab].filter(Boolean).join(" · ");
      const msg = encodeURIComponent(`Olá! Quero pedir: ${r.nome}`);
      return `<li class="c" data-cat="${esc(r.cat)}" data-q="${esc(norm(r.nome + " " + r.apres + " " + r.lab))}"><div class="i"><h3>${esc(r.nome)}</h3>${sub ? `<p class="s">${sub}</p>` : ""}<p class="d">Disponível</p>${r.mip ? `<p class="m">Leia a bula. Se persistirem os sintomas, o médico deverá ser consultado.</p>` : ""}</div><div class="p"><strong>${brl(r.preco)}</strong>${wa ? `<a class="w" rel="noopener" href="https://wa.me/${wa}?text=${msg}">Pedir no WhatsApp</a>` : ""}</div></li>`;
    })
    .join("");

  let atualizado = "";
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(geradoEm || ""));
  if (m) atualizado = `Atualizado em ${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}.`;

  const chips = [`<button class="ch on" data-cat="">Todos (${rows.length})</button>`, ...cats.map((c) => `<button class="ch" data-cat="${esc(c)}">${esc(c)} (${counts[c]})</button>`)].join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Drogaria União Farma – Nações Unidas · Catálogo</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#faf7f7;color:#222;line-height:1.35}
header{background:#c8102e;color:#fff;padding:14px 16px}header h1{margin:0;font-size:1.25rem}header p{margin:2px 0 0;font-size:.85rem;opacity:.92}
.bar{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid #eee;padding:10px 12px}
.bar input{width:100%;font-size:1rem;padding:11px 12px;border:1px solid #ccc;border-radius:10px}
.chs{display:flex;gap:8px;overflow-x:auto;padding:8px 0 2px;-webkit-overflow-scrolling:touch}
.ch{flex:none;border:1px solid #c8102e;background:#fff;color:#c8102e;border-radius:999px;padding:7px 12px;font-size:.85rem;cursor:pointer}.ch.on{background:#c8102e;color:#fff}
main{max-width:860px;margin:0 auto;padding:10px 12px 24px}#n{font-size:.85rem;color:#666;margin:4px 2px 8px}
ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.c{background:#fff;border:1px solid #eee;border-radius:12px;padding:12px;display:flex;gap:10px;justify-content:space-between;align-items:center;content-visibility:auto;contain-intrinsic-size:auto 110px}
.i{min-width:0;flex:1}.i h3{margin:0;font-size:.95rem;font-weight:600;word-break:break-word}.s{margin:3px 0 0;font-size:.8rem;color:#666}
.d{margin:4px 0 0;font-size:.78rem;color:#1a7f37;font-weight:600}.m{margin:4px 0 0;font-size:.72rem;color:#555}
.p{flex:none;text-align:right;display:flex;flex-direction:column;gap:8px;align-items:flex-end}.p strong{font-size:1.1rem;color:#c8102e}
.w{display:inline-block;background:#c8102e;color:#fff;text-decoration:none;border-radius:8px;padding:9px 11px;font-size:.8rem;font-weight:600;white-space:nowrap}
.hide{display:none!important}.vazio{text-align:center;color:#666;padding:30px 0}
footer{background:#fff;border-top:1px solid #eee;padding:16px;font-size:.78rem;color:#555}footer p{margin:0 0 8px;max-width:860px;margin-left:auto;margin-right:auto}
@media(max-width:380px){.c{flex-direction:column;align-items:stretch}.p{flex-direction:row;justify-content:space-between;align-items:center}}
</style></head><body>
<header><h1>Drogaria União Farma – Nações Unidas</h1><p>Sabará – MG · Produtos sem exigência de receita</p></header>
<div class="bar"><input id="q" type="search" placeholder="Buscar produto…" autocomplete="off" aria-label="Buscar produto"><div class="chs">${chips}</div></div>
<main><p id="n">${rows.length} produtos</p><ul id="l">${cards}</ul><p id="v" class="vazio hide">Nenhum produto encontrado.</p></main>
<footer>
<p><strong>Preços sujeitos a alteração sem aviso; consulte disponibilidade.</strong> ${esc(atualizado)} Imagens meramente ilustrativas, quando houver.</p>
<p><strong>MEDICAMENTOS ISENTOS DE PRESCRIÇÃO:</strong> LEIA A BULA. SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO.</p>
<p>Medicamentos e produtos para a saúde devem ser usados conforme orientação do farmacêutico ou do médico. Pedidos sujeitos a confirmação pela farmácia.</p>
<p>Drogaria União Farma – Nações Unidas · Sabará – MG.</p>
</footer>
<script>
(function(){var q=document.getElementById('q'),L=[].slice.call(document.querySelectorAll('#l .c')),n=document.getElementById('n'),v=document.getElementById('v'),cat='';
function norm(s){return s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase()}
function f(){var t=norm(q.value.trim()).split(/\\s+/).filter(Boolean),k=0;L.forEach(function(e){var ok=(!cat||e.dataset.cat===cat)&&t.every(function(w){return e.dataset.q.indexOf(w)>-1});e.classList.toggle('hide',!ok);if(ok)k++});n.textContent=k+(k===1?' produto':' produtos');v.classList.toggle('hide',k>0)}
q.addEventListener('input',f);
document.querySelectorAll('.ch').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('.ch').forEach(function(x){x.classList.remove('on')});b.classList.add('on');cat=b.dataset.cat;f()})});
})();
</script></body></html>`;
}

const HDR = { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer" };

async function loja(request, env) {
  // Rendered HTML cached in KV for 5 min (key html:nacoes) so the heavy parse/render runs at most every ~5 min.
  const cached = await env.CATALOGO.get("html:nacoes");
  if (cached) return new Response(cached, { headers: HDR });
  const gz = await env.CATALOGO.get(lojaKey("itacolomi"), "arrayBuffer");
  const rawAllow = await env.CATALOGO.get(allowKey("itacolomi"));
  if (!gz || !rawAllow) return new Response("Catálogo indisponível no momento.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
  const data = JSON.parse(new TextDecoder().decode(await gunzip(new Uint8Array(gz))));
  const exclude = new Set(String(env.EXCLUDE_CLASSES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  const allow = new Set(JSON.parse(rawAllow).map((c) => String(c).trim()));
  const rawMip = await env.CATALOGO.get(mipKey("itacolomi"));
  const mip = new Set(rawMip ? JSON.parse(rawMip) : []);
  const itens = data.itens.filter((i) => {
    if (!ofertavel(i, exclude)) return false;
    const c = String(i.CodigoDeBarras ?? "").trim();
    return c.length >= 6 && allow.has(c);
  });
  const rawSel = await env.CATALOGO.get("selecao:nacoes");
  let lista = itens, catMap = null;
  if (rawSel) { catMap = JSON.parse(rawSel); lista = itens.filter((i) => Object.prototype.hasOwnProperty.call(catMap, String(i.CodigoDeBarras ?? "").trim())); }
  const html = renderLoja(lista, mip, data.geradoEm, env.WHATSAPP_NUMERO, catMap);
  await env.CATALOGO.put("html:nacoes", html, { expirationTtl: 300 });
  return new Response(html, { headers: HDR });
}

const ORIGENS_SITE = new Set([
  "https://xn--uniofarmasabar-8gbu.com.br",
  "https://www.xn--uniofarmasabar-8gbu.com.br",
  "https://site-uniao-farma.thiagofelipegm7.workers.dev",
]);

// GET /loja/nacoes.json: só a seleção curada, campos públicos (sem estoque, sem código de barras).
async function lojaJson(request, env) {
  const origin = request.headers.get("origin") || "";
  const h = { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff", vary: "Origin" };
  if (ORIGENS_SITE.has(origin)) { h["access-control-allow-origin"] = origin; h["access-control-allow-methods"] = "GET, OPTIONS"; }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  const cached = await env.CATALOGO.get("json:nacoes");
  if (cached) return new Response(cached, { headers: h });
  const gz = await env.CATALOGO.get(lojaKey("itacolomi"), "arrayBuffer");
  const rawAllow = await env.CATALOGO.get(allowKey("itacolomi"));
  const rawSel = await env.CATALOGO.get("selecao:nacoes");
  if (!gz || !rawAllow || !rawSel) return new Response(JSON.stringify({ error: "indisponivel" }), { status: 503, headers: { ...h, "cache-control": "no-store" } });
  const data = JSON.parse(new TextDecoder().decode(await gunzip(new Uint8Array(gz))));
  const exclude = new Set(String(env.EXCLUDE_CLASSES || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
  const allow = new Set(JSON.parse(rawAllow).map((c) => String(c).trim()));
  const sel = JSON.parse(rawSel);
  const rawMip = await env.CATALOGO.get(mipKey("itacolomi"));
  const mip = new Set(rawMip ? JSON.parse(rawMip) : []);
  const itens = [];
  for (const i of data.itens) {
    const c = String(i.CodigoDeBarras ?? "").trim();
    if (!ofertavel(i, exclude) || c.length < 6 || !allow.has(c) || !Object.prototype.hasOwnProperty.call(sel, c)) continue;
    const preco = Number(i.Pvenda);
    const nome = String(i.Produto ?? "").replace(/\s+/g, " ").trim();
    if (!nome || !Number.isFinite(preco) || preco <= 0) continue;
    const lab = String(i.Laboratorio ?? "").trim();
    itens.push({ nome, lab: /^diversos$/i.test(lab) ? "" : lab, categoria: sel[c], preco, isMIP: mip.has(c) });
  }
  itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const body = JSON.stringify({ loja: "nacoes", geradoEm: data.geradoEm, total: itens.length, itens });
  await env.CATALOGO.put("json:nacoes", body, { expirationTtl: 300 });
  return new Response(body, { headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return new Response("ok");
    if (request.method === "POST" && url.pathname === "/upload") return upload(request, env);
    if (request.method === "POST" && url.pathname === "/delta") return delta(request, env);
    if (request.method === "POST" && url.pathname === "/heartbeat") return heartbeat(request, env);
    if (request.method === "POST" && url.pathname === "/allowlist") return allowlist(request, env);
    if (request.method === "GET" && url.pathname === "/catalogo") return catalogo(request, env, url);
    if (request.method === "GET" && /^\/loja\/nacoes\/?$/.test(url.pathname)) return loja(request, env);
    if ((request.method === "GET" || request.method === "OPTIONS") && url.pathname === "/loja/nacoes.json") return lojaJson(request, env);
    return json({ error: "not_found" }, 404);
  },
};
