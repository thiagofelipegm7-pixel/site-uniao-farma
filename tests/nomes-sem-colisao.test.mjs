import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PASTAS = ["app", "scripts", "worker", "db"];
const CODIGO = /\.(ts|tsx|mjs|js|jsx)$/;

function arquivos(pasta) {
  const saida = [];
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) saida.push(...arquivos(caminho));
    else if (CODIGO.test(item.name)) saida.push(caminho);
  }
  return saida;
}

// No Windows e no macOS o disco não diferencia maiúsculas: `import "./preco"` ao lado de Preco.tsx e preco.ts
// abre o arquivo errado e o build quebra (MISSING_EXPORT), embora passe no Linux do GitHub.
test("nenhuma pasta tem dois módulos cujo nome só muda em maiúsculas ou na extensão", () => {
  const vistos = new Map();
  const colisoes = [];
  for (const pasta of PASTAS) {
    for (const caminho of arquivos(join(RAIZ, pasta))) {
      const chave = caminho.replace(CODIGO, "").toLowerCase();
      if (vistos.has(chave)) colisoes.push(`${vistos.get(chave)} x ${caminho}`);
      else vistos.set(chave, caminho);
    }
  }
  assert.deepEqual(colisoes, []);
});
