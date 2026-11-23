import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("GaleriaProduto é componente de cliente: 'use client' é a primeira instrução", async () => {
  const src = await ler("app/nacoes-unidas/produtos/GaleriaProduto.tsx");
  const semComentario = src.replace(/^\s*(\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*/, "");
  assert.match(semComentario, /^["']use client["']\s*;/, "sem 'use client' no topo o useState quebra a ficha no Worker (HTTP 500)");
  assert.doesNotMatch(src, /^import .*[\s\S]*?["']use client["']/m);
});
