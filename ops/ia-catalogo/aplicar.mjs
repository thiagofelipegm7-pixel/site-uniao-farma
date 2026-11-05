// Lê as respostas brutas do Workers AI, valida e junta no estado. Uso:
//   node ... aplicar.mjs <descricoes|pares> <pastaDasRespostas> <manifesto.json> <estado.json>
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { carregarItens, extrairJson } from "./comum.mjs";
import { reprovarDescricao } from "./descricoes-regras.mjs";
import { validarEscolha } from "./pares-regras.mjs";

const [tipo, pasta, manifestoPath, estadoPath] = process.argv.slice(2);
const manifesto = JSON.parse(readFileSync(manifestoPath, "utf8"));
const estado = existsSync(estadoPath) ? JSON.parse(readFileSync(estadoPath, "utf8")) : { ok: {}, motivos: {} };
const itens = new Map(carregarItens().map((i) => [i.slug, i]));

let respostas = 0;
let erros = 0;
for (const arq of readdirSync(pasta).filter((f) => f.endsWith(".txt") && !(process.env.IGNORAR ?? "").split(",").includes(f))) {
  const bruto = readFileSync(`${pasta}/${arq}`, "utf8");
  let lista;
  try {
    lista = JSON.parse(bruto.slice(bruto.indexOf("["), bruto.lastIndexOf("]") + 1));
  } catch {
    continue;
  }
  for (const r of lista) {
    const lote = manifesto.lotes[r.id];
    if (!lote || r.erro) {
      if (r.erro) erros += 1;
      continue;
    }
    const json = extrairJson(r.texto);
    if (!json) continue;
    const valores = Object.values(json);
    const ehPares = valores.some((v) => Array.isArray(v));
    if ((tipo === "pares") !== ehPares) continue;
    respostas += 1;
    lote.slugs.forEach((slug, n) => {
      const v = json[String(n + 1)];
      if (tipo === "descricoes") {
        if (typeof v !== "string") return;
        const motivo = reprovarDescricao(v, itens.get(slug));
        if (motivo) estado.motivos[slug] = motivo;
        else {
          estado.ok[slug] = v.replace(/\s+/g, " ").trim();
          delete estado.motivos[slug];
        }
      } else {
        const cands = manifesto.candidatos[slug].map((s) => itens.get(s)).map((i) => i);
        const escolha = validarEscolha(v, cands);
        if (escolha) estado.ok[slug] = escolha;
        else estado.motivos[slug] = "menos de 3 válidas";
      }
    });
  }
}
writeFileSync(estadoPath, JSON.stringify(estado));
const total = tipo === "pares" ? Object.keys(manifesto.candidatos).filter((s) => manifesto.lotes.some((l) => l.slugs.includes(s))).length : manifesto.lotes.reduce((n, l) => n + l.slugs.length, 0);
console.log({ respostas, erros, ok: Object.keys(estado.ok).length, total });
const contagem = {};
for (const [s, m] of Object.entries(estado.motivos)) if (!estado.ok[s]) contagem[m.split(":")[0]] = (contagem[m.split(":")[0]] ?? 0) + 1;
console.log("reprovados", contagem);
