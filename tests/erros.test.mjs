import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const E = await import("../app/erros.ts");

test("erros do cliente: limpa dado pessoal, descarta ruído e dá a mesma assinatura ao mesmo erro", () => {
  const ok = E.limparErro({ msg: "TypeError: x is undefined (maria@email.com, 31 98762-9909) ?q=dipirona#a", arq: "https://xn--uniofarmasabar-8gbu.com.br/_next/static/chunks/app-abc.js?v=1", lin: 42, pag: "https://x.com.br/reserva?nome=Maria", ua: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" });
  assert.ok(ok);
  assert.doesNotMatch(JSON.stringify(ok), /maria|98762|dipirona|nome=|\?v=/i);
  assert.equal(ok.pag, "/reserva");
  assert.equal(ok.arq, "chunks/app-abc.js");
  assert.equal(ok.aparelho, "Chrome no Android");
  const igual = E.limparErro({ msg: ok.msg, arq: "https://xn--uniofarmasabar-8gbu.com.br/_next/static/chunks/app-abc.js", lin: 42, pag: "/outra", ua: "" });
  assert.equal(igual.chave, ok.chave, "mesma mensagem, arquivo e linha = mesmo erro");
  assert.equal(E.limparErro({ msg: "ResizeObserver loop completed with undelivered notifications." }), null);
  assert.equal(E.limparErro({ msg: "Script error." }), null);
  assert.equal(E.limparErro({ msg: "erro de extensão", arq: "chrome-extension://abc/x.js" }), null);
  assert.equal(E.limparErro({ msg: "de anúncio", arq: "https://www.googletagmanager.com/gtag/js" }), null, "arquivo de outro endereço é ruído");
  assert.equal(E.limparErro({ msg: "" }), null);
  assert.equal(E.aparelhoDoUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"), "Safari no iOS");
});

test("erros do cliente: conta por dia, para no limite diário e o painel só lê os últimos dias", async () => {
  const linhas = new Map();
  const db = {
    exec: async () => undefined,
    prepare: (sql) => ({
      bind: (...v) => ({
        run: async () => {
          if (/^INSERT INTO erro_cliente/.test(sql)) {
            const k = `${v[0]}|${v[1]}|${v[6]}`;
            const l = linhas.get(k);
            linhas.set(k, l ? { ...l, n: l.n + 1, ultimo: v[7] } : { chave: v[0], dia: v[1], msg: v[2], arq: v[3], lin: v[4], pag: v[5], aparelho: v[6], n: 1, ultimo: v[7] });
          }
        },
        first: async () => ({ t: [...linhas.values()].filter((l) => l.dia === v[0]).reduce((s, l) => s + l.n, 0) }),
        all: async () => ({ results: [...linhas.values()].filter((l) => l.dia >= v[0]) }),
      }),
    }),
  };
  const e = E.limparErro({ msg: "Falha", arq: "a.js", lin: 1, pag: "/", ua: "Android Chrome/1" });
  assert.equal(await E.registrarErro(db, e, "2026-11-08"), true);
  assert.equal(await E.registrarErro(db, e, "2026-11-08"), true);
  assert.equal([...linhas.values()][0].n, 2, "o mesmo erro vira contagem");
  assert.equal((await E.listarErros(db, "2026-11-01")).length, 1);
  for (let i = 0; i < E.LIMITE_POR_DIA; i += 1) linhas.set(`x${i}`, { chave: `x${i}`, dia: "2026-11-09", n: 1 });
  assert.equal(await E.registrarErro(db, e, "2026-11-09"), false, "passou do limite do dia: descarta");
});

test("erros do cliente: a página registra pelo layout e a rota pública não pede cookie nem guarda IP", async () => {
  const [layout, rota, mw] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/erro-cliente/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../middleware.ts", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /<RegistroDeErros \/>/);
  assert.match(rota, /status: 413/);
  assert.doesNotMatch(rota, /registrarErro\([^)]*ip/i, "o IP só serve para o limite por minuto, nunca é gravado");
  assert.match(mw, /staffPath = [^;]*"\/api\/interno\/erros"/);
});
