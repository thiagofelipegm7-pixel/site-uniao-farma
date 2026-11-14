import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** Roda public/sw.js num ambiente falso e devolve os ouvintes e o cache em memória. */
async function carregarSw(fetchFalso) {
  const ouvintes = new Map();
  const guardados = new Map();
  const cache = {
    put: async (pedido, resposta) => void guardados.set(typeof pedido === "string" ? pedido : new URL(pedido.url).pathname, resposta),
    match: async (pedido) => guardados.get(typeof pedido === "string" ? pedido : new URL(pedido.url).pathname),
    addAll: async (urls) => {
      // Igual ao navegador: guarda a resposta como veio, inclusive quando houve redirecionamento.
      for (const url of urls) {
        const resposta = await fetchFalso(url);
        if (!resposta.ok) throw new TypeError("addAll falhou");
        guardados.set(url, resposta);
      }
    },
  };
  const caches = { open: async () => cache, match: (pedido) => cache.match(pedido), keys: async () => [], delete: async () => true };
  const self = {
    addEventListener: (tipo, f) => ouvintes.set(tipo, f),
    skipWaiting: async () => undefined,
    clients: { claim: async () => undefined },
    location: { origin: "https://loja.test" },
  };
  vm.runInNewContext(await read("public/sw.js"), { self, caches, fetch: fetchFalso, Response, URL, Promise, Error, TypeError });
  return { ouvintes, guardados };
}

/** Como a Cloudflare responde /offline.html: 307 para /offline, e o navegador entrega a resposta final marcada como redirecionada. */
function respostaRedirecionada(corpo) {
  const resposta = new Response(corpo, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  Object.defineProperty(resposta, "redirected", { value: true });
  return resposta;
}

test("service worker: a página offline guardada não fica marcada como redirecionada", async () => {
  const fetchFalso = async (url) => (String(url).endsWith("/offline.html") ? respostaRedirecionada("<h1>Você está offline</h1>") : new Response("ok"));
  const { ouvintes, guardados } = await carregarSw(fetchFalso);
  let espera;
  ouvintes.get("install")({ waitUntil: (p) => (espera = p) });
  await espera;
  const offline = guardados.get("/offline.html");
  assert.ok(offline, "a página offline precisa estar no cache depois da instalação");
  // O navegador recusa (net::ERR_FAILED) uma resposta redirecionada entregue a uma navegação.
  assert.equal(offline.redirected, false);
  assert.equal(offline.status, 200);
  assert.match(offline.headers.get("content-type"), /text\/html/);
  assert.match(await offline.clone().text(), /Você está offline/);
});

test("service worker: sem rede, a navegação recebe a página offline", async () => {
  let semRede = false;
  const fetchFalso = async (pedido) => {
    if (semRede) throw new TypeError("Failed to fetch");
    return String(pedido.url ?? pedido).endsWith("/offline.html") ? respostaRedirecionada("<h1>Você está offline</h1>") : new Response("ok");
  };
  const { ouvintes } = await carregarSw(fetchFalso);
  let espera;
  ouvintes.get("install")({ waitUntil: (p) => (espera = p) });
  await espera;
  semRede = true;
  let entregue;
  ouvintes.get("fetch")({
    request: { method: "GET", url: "https://loja.test/ofertas", mode: "navigate", headers: new Headers({ accept: "text/html" }) },
    respondWith: (p) => (entregue = p),
  });
  const resposta = await entregue;
  assert.equal(resposta.redirected, false);
  assert.match(await resposta.text(), /Você está offline/);
});

test("service worker e PwaRegister usam a mesma versão de cache", async () => {
  // O PwaRegister apaga todos os caches quando a versão muda. Se o sw.js não mudar junto, ele não reinstala
  // e a página offline some do aparelho de quem já visitou o site.
  const [sw, registro] = await Promise.all([read("public/sw.js"), read("app/PwaRegister.tsx")]);
  const noSw = sw.match(/CACHE_NAME = "([^"]+)"/)?.[1];
  const noRegistro = registro.match(/CACHE_BUST = "([^"]+)"/)?.[1];
  assert.ok(noSw && noRegistro);
  assert.equal(noSw, noRegistro);
});
