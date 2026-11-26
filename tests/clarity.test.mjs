import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");
const C = await import("../app/clarity.ts");

test("Clarity: sem ID, sem aceite ou no /interno, não carrega", () => {
  const id = "abc123xyz";
  assert.equal(C.CLARITY_PROJECT_ID, "zji1cnkn76");
  assert.equal(C.podeCarregarClarity({ projectId: "", aceito: true, pathname: "/" }), false);
  assert.equal(C.podeCarregarClarity({ projectId: "   ", aceito: true, pathname: "/" }), false);
  assert.equal(C.podeCarregarClarity({ projectId: id, aceito: false, pathname: "/" }), false);
  assert.equal(C.podeCarregarClarity({ projectId: id, aceito: true, pathname: "/interno" }), false);
  assert.equal(C.podeCarregarClarity({ projectId: id, aceito: true, pathname: "/interno/vendas" }), false);
  assert.equal(C.podeCarregarClarity({ projectId: id, aceito: true, pathname: "/" }), true);
  assert.equal(C.podeCarregarClarity({ projectId: id, aceito: true, pathname: "/reserva" }), true);
  assert.equal(C.urlDoClarity(id), `https://www.clarity.ms/tag/${id}`);
});

test("Clarity: com ID e aceite, o script é agendado ocioso; sem isso, nada é inserido", () => {
  const scripts = [];
  const idle = [];
  const timeouts = [];
  const w = {
    location: { pathname: "/" },
    requestIdleCallback: (cb, opts) => {
      idle.push({ cb, opts });
      return 1;
    },
    setTimeout: (cb) => {
      timeouts.push(cb);
      return 1;
    },
    document: undefined,
  };
  w.document = {
    getElementById: () => null,
    createElement: () => ({}),
    head: { appendChild: (s) => scripts.push(s) },
  };
  const anterior = globalThis.window;
  const docAnterior = globalThis.document;
  globalThis.window = w;
  globalThis.document = w.document;
  try {
    C.agendarClarity({ projectId: "", aceito: true, pathname: "/" });
    C.agendarClarity({ projectId: "abc", aceito: false, pathname: "/" });
    C.agendarClarity({ projectId: "abc", aceito: true, pathname: "/interno/vendas" });
    assert.deepEqual(idle, []);
    assert.deepEqual(scripts, []);

    C.agendarClarity({ projectId: "abc123xyz", aceito: true, pathname: "/nacoes-unidas/produtos" });
    assert.equal(idle.length, 1);
    assert.equal(idle[0].opts.timeout, 4000);
    assert.deepEqual(scripts, []);
    idle[0].cb();
    assert.equal(scripts.length, 1);
    assert.equal(scripts[0].id, C.CLARITY_SCRIPT_ID);
    assert.equal(scripts[0].async, true);
    assert.equal(scripts[0].src, C.urlDoClarity("abc123xyz"));
    // Segunda chamada não insere de novo.
    C.inserirScriptClarity("abc123xyz");
    assert.equal(scripts.length, 1);
  } finally {
    globalThis.window = anterior;
    globalThis.document = docAnterior;
  }
});

test("Clarity: só entra depois do aceite do GA, nunca no <head> e nunca no painel", async () => {
  const [consent, bootstrap, layout, modulo] = await Promise.all([
    ler("app/AnalyticsConsent.tsx"),
    ler("app/ga-bootstrap.ts"),
    ler("app/layout.tsx"),
    ler("app/clarity.ts"),
  ]);
  assert.match(consent, /agendarClarity\(\{ aceito: true, pathname: window\.location\.pathname \}\)/);
  const inicio = consent.indexOf("function startAnalytics()");
  const fim = consent.indexOf("function readStoredConsent()");
  assert.ok(inicio > 0 && fim > inicio);
  const dentro = consent.slice(inicio, fim);
  assert.match(dentro, /agendarClarity/);
  assert.doesNotMatch(consent.slice(fim), /agendarClarity|clarity\.ms/);
  assert.doesNotMatch(bootstrap, /clarity/i);
  assert.doesNotMatch(layout, /clarity\.ms/);
  assert.match(modulo, /requestIdleCallback/);
  assert.match(modulo, /data-clarity-mask/);
  assert.match(modulo, /Strict/);
});

test("Clarity: busca, cesta e checkout têm data-clarity-mask; a privacidade cita o aceite", async () => {
  const [header, fluxo, sacola, restrita, privacidade, config] = await Promise.all([
    ler("app/shop/ShopHeader.tsx"),
    ler("app/reserva/ReservaFluxo.tsx"),
    ler("app/reserva/ReservaSacola.tsx"),
    ler("app/nacoes-unidas/produtos/ListaRestrita.tsx"),
    ler("app/privacidade/page.tsx"),
    ler("app/site-config.ts"),
  ]);
  assert.match(header, /id="shop-busca-q"[\s\S]*data-clarity-mask="true"/);
  assert.match(restrita, /id="restrito-q"[\s\S]*data-clarity-mask="true"/);
  assert.equal((fluxo.match(/data-clarity-mask="true"/g) || []).length, 2);
  assert.match(sacola, /reserva-gaveta-raiz[\s\S]*data-clarity-mask="true"/);
  assert.match(privacidade, /Microsoft Clarity/);
  assert.match(privacidade, /somente são carregados após sua\s+autorização no banner de cookies/);
  assert.match(config, /NEXT_PUBLIC_CLARITY_PROJECT_ID \|\| "zji1cnkn76"/);
});
