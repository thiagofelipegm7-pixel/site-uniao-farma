import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const workerPath = new URL("../dist/server/index.js", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL(workerPath);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("axe-core finds no critical or serious issues on key public pages", async (t) => {
  if (!existsSync(new URL("../dist/server/index.js", import.meta.url))) {
    t.skip("dist/server/index.js ausente — rode npm run build antes");
    return;
  }

  const { JSDOM } = await import("jsdom");
  const axeJs = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

  const paths = ["/", "/fatima", "/itacolomi", "/nacoes-unidas", "/ofertas", "/novidades", "/receita", "/perguntas", "/institucional"];

  for (const pathname of paths) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    const dom = new JSDOM(html, {
      url: `https://xn--uniofarmasabar-8gbu.com.br${pathname}`,
      runScripts: "dangerously",
      pretendToBeVisual: true,
    });
    const script = dom.window.document.createElement("script");
    script.textContent = axeJs;
    dom.window.document.head.appendChild(script);
    const results = await dom.window.axe.run(dom.window.document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    });
    const blocking = results.violations.filter((item) => ["critical", "serious"].includes(item.impact));
    assert.equal(
      blocking.length,
      0,
      `${pathname}\n${blocking.map((item) => `${item.impact} ${item.id}: ${item.help}`).join("\n")}`,
    );
    dom.window.close();
  }
});
