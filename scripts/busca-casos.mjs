// Casos de regressão da busca (tests/busca-casos.json). Uso:
//   npm run busca:casos -- add "rimel" "fraldinha"   -> acrescenta as buscas com o resultado de hoje
//   npm run busca:casos -- check                      -> lista o que piorou ou melhorou em relação ao registrado
//   npm run busca:casos -- refresh                    -> grava as melhoras (nunca grava piora)
import { readFileSync, writeFileSync } from "node:fs";
import { avaliarBusca, carregarContexto, NOTA } from "../tests/helpers/busca-avaliar.mjs";

const arquivo = new URL("../tests/busca-casos.json", import.meta.url);
const casos = JSON.parse(readFileSync(arquivo, "utf8"));
const ctx = carregarContexto();
const [, , comando, ...resto] = process.argv;
const salvar = () => writeFileSync(arquivo, JSON.stringify(casos.sort((a, b) => a.q.localeCompare(b.q, "pt-BR")), null, 0).replace(/\},\{/g, "},\n{").replace(/^\[/, "[\n").replace(/\]$/, "\n]\n"));

if (comando === "add") {
  for (const q of resto.map((x) => x.trim()).filter(Boolean)) {
    if (casos.some((c) => c.q === q)) { console.log(`já existe: ${q}`); continue; }
    const r = avaliarBusca(q, ctx);
    casos.push({ q, st: r.st, n: r.n });
    console.log(`${r.st.padEnd(13)} ${String(r.n).padStart(4)}  ${q}`);
  }
  salvar();
} else if (comando === "check" || comando === "refresh") {
  let piorou = 0;
  let melhorou = 0;
  for (const c of casos) {
    const r = avaliarBusca(c.q, ctx);
    if (NOTA[r.st] < NOTA[c.st]) { piorou++; console.log(`PIOROU   ${c.q}: ${c.st} -> ${r.st}`); }
    else if (NOTA[r.st] > NOTA[c.st]) { melhorou++; console.log(`melhorou ${c.q}: ${c.st} -> ${r.st}`); if (comando === "refresh") { c.st = r.st; c.n = r.n; } }
  }
  if (comando === "refresh") salvar();
  console.log(`${casos.length} casos: ${piorou} pioraram, ${melhorou} melhoraram.`);
} else {
  console.log("Uso: busca-casos.mjs add|check|refresh");
}
