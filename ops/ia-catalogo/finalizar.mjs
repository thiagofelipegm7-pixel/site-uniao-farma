// Junta o que a IA escolheu com as regras e grava os arquivos de dados do site.
//   node ... finalizar.mjs <pares-estado.json> <desc-estado.json> <saida-csv>
import { readFileSync, writeFileSync } from "node:fs";
import { carregarItens, elegivelParaPares, ehNbcal, ehFormulaInfantil } from "./comum.mjs";
import { descricaoPorModelo } from "./descricoes-regras.mjs";
import { elegiveis, escolhaPorRegra, notaDoPar, NOTA_PARA_EXIBIR } from "./pares-regras.mjs";

const [paresPath, descPath, csvPath] = process.argv.slice(2);
const itens = carregarItens();
const porSlug = new Map(itens.map((i) => [i.slug, i]));
const elegiv = elegiveis(itens);
const paresIA = JSON.parse(readFileSync(paresPath, "utf8")).ok;
const descIA = JSON.parse(readFileSync(descPath, "utf8")).ok;

const pares = {};
let daIA = 0;
let daRegra = 0;
for (const item of elegiv) {
  const escolha = (paresIA[item.slug] ?? []).filter((s) => {
    const alvo = porSlug.get(s);
    return alvo && alvo.slug !== item.slug && elegivelParaPares(alvo) && notaDoPar(item, alvo) >= NOTA_PARA_EXIBIR;
  });
  if (escolha.length >= 3) {
    pares[item.slug] = escolha.slice(0, 6);
    daIA += 1;
    continue;
  }
  const regra = escolhaPorRegra(item, elegiv);
  if (regra.length >= 3) {
    pares[item.slug] = regra;
    daRegra += 1;
  }
}
const ordenar = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(new URL("../../app/nacoes-unidas/produtos/dados/relacionados-ia.json", import.meta.url), `${JSON.stringify(ordenar(pares))}\n`);

const descricoes = {};
let ia = 0;
let modelo = 0;
const linhas = ["slug;origem;nome;texto"];
for (const item of itens) {
  if (ehNbcal(item.nome) || ehFormulaInfantil(item.nome)) continue;
  const texto = descIA[item.slug];
  const registro = texto ? { t: texto, f: "ia" } : { t: descricaoPorModelo(item), f: "modelo" };
  if (texto) ia += 1;
  else modelo += 1;
  descricoes[item.slug] = registro;
  linhas.push([item.slug, registro.f, item.nome, registro.t].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"));
}
writeFileSync(new URL("../../app/nacoes-unidas/produtos/dados/descricoes-ia.json", import.meta.url), `${JSON.stringify(ordenar(descricoes))}\n`);
writeFileSync(csvPath, `${linhas.join("\n")}\n`);
console.log({ elegiveis: elegiv.length, paresIA: daIA, paresRegra: daRegra, comPares: Object.keys(pares).length, descricoesIA: ia, descricoesModelo: modelo });
