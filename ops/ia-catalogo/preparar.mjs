// Gera os lotes de IA (um arquivo JS por grupo de chamadas, para rodar no Workers AI) e o manifesto.
// Uso: node --experimental-strip-types --import ./tests/ts-resolve-hook.mjs ops/ia-catalogo/preparar.mjs <pares|descricoes> <saida> [porLote] [lotesPorArquivo]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { carregarItens, ehNbcal, ehFormulaInfantil, MODELO } from "./comum.mjs";
import { PROMPT_DESCRICAO } from "./descricoes-regras.mjs";
import { PROMPT_PARES, elegiveis, candidatosDe } from "./pares-regras.mjs";

const [tipo, saida, porLoteArg, porArquivoArg] = process.argv.slice(2);
if (!["pares", "descricoes"].includes(tipo) || !saida) throw new Error("uso: preparar.mjs <pares|descricoes> <saida> [porLote] [lotesPorArquivo]");
mkdirSync(saida, { recursive: true });
const itens = carregarItens();
const porLote = Number(porLoteArg) || (tipo === "pares" ? 6 : 12);
const porArquivo = Number(porArquivoArg) || 12;

let entradas;
let sistema;
let manifestoExtra = {};
if (tipo === "descricoes") {
  entradas = itens.filter((i) => !ehNbcal(i.nome) && !ehFormulaInfantil(i.nome));
  sistema = PROMPT_DESCRICAO;
} else {
  const todos = elegiveis(itens);
  manifestoExtra = Object.fromEntries(todos.map((i) => [i.slug, candidatosDe(i, todos).map((c) => c.slug)]));
  entradas = todos.filter((i) => manifestoExtra[i.slug].length >= 3);
  sistema = PROMPT_PARES;
}

if (process.env.SO_SLUGS) {
  const so = new Set(JSON.parse(readFileSync(process.env.SO_SLUGS, "utf8")));
  entradas = entradas.filter((i) => so.has(i.slug));
}

const lotes = [];
for (let i = 0; i < entradas.length; i += porLote) lotes.push(entradas.slice(i, i + porLote));

function textoDoLote(lote) {
  if (tipo === "descricoes") {
    return lote.map((it, n) => `${n + 1}. nome: ${it.nome} | categoria: ${it.categoria} | medicamento: ${it.isMIP ? "sim" : "não"}`).join("\n");
  }
  const nomePorSlug = new Map(itens.map((i) => [i.slug, i.exibicao || i.nome]));
  return lote
    .map((it, n) => {
      const cands = manifestoExtra[it.slug].map((s, k) => `a${k + 1}=${nomePorSlug.get(s)}`).join("; ");
      return `${n + 1}. ${it.exibicao || it.nome}\n   candidatos: ${cands}`;
    })
    .join("\n");
}

const arquivos = [];
for (let a = 0; a * porArquivo < lotes.length; a += 1) {
  const grupo = lotes.slice(a * porArquivo, (a + 1) * porArquivo).map((lote, k) => ({ id: a * porArquivo + k, slugs: lote.map((i) => i.slug), user: textoDoLote(lote) }));
  const codigo = `async () => {
  const sistema = ${JSON.stringify(sistema)};
  const grupo = ${JSON.stringify(grupo.map((g) => ({ id: g.id, user: g.user })))};
  const um = async (g) => {
    for (let t = 0; t < 3; t += 1) {
      try {
        const r = await cloudflare.request({ method: "POST", path: \`/accounts/\${accountId}/ai/run/${MODELO}\`, body: { messages: [{ role: "system", content: sistema }, { role: "user", content: g.user }], max_tokens: 1800, temperature: 0.2, chat_template_kwargs: { enable_thinking: false } } });
        const res = r.result ?? r;
        return { id: g.id, texto: res?.choices?.[0]?.message?.content ?? res?.response ?? "", usage: res?.usage ?? null };
      } catch (e) { if (t === 2) return { id: g.id, erro: String(e).slice(0, 200) }; }
    }
  };
  const saida = await Promise.all(grupo.map(um));
  return saida;
}`;
  writeFileSync(`${saida}/${tipo}-${String(a).padStart(2, "0")}.js`, codigo);
  arquivos.push(...grupo.map((g) => ({ id: g.id, slugs: g.slugs })));
}
writeFileSync(`${saida}/${tipo}-manifesto.json`, JSON.stringify({ lotes: arquivos, candidatos: manifestoExtra }));
console.log(tipo, "itens", entradas.length, "lotes", lotes.length, "arquivos", Math.ceil(lotes.length / porArquivo));
