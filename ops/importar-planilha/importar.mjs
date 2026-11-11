// Importa descrições de uma planilha do fornecedor (CSV) para descricoes-pesquisa.json.
// Uso (a partir da raiz do repositório):
//   node --experimental-strip-types --import ./tests/ts-resolve-hook.mjs ops/importar-planilha/importar.mjs planilha.csv --fonte https://site-do-fornecedor.com.br
//   (acrescente --aplicar para gravar; sem ele só mostra o relatório)
// Colunas reconhecidas pelo cabeçalho: código de barras (EAN/GTIN/código de barras) e descrição (descrição/texto/detalhes).
// Coluna opcional "fonte"/"link" com https por linha; sem ela vale --fonte.
import { readFileSync, writeFileSync } from "node:fs";
import { carregarCatalogoNacoes, slugify } from "../../app/nacoes-unidas/produtos/catalogo.ts";
import { ehNbcal } from "../../app/nacoes-unidas/produtos/produto.ts";
import { ehFormulaInfantil } from "../../app/nacoes-unidas/produtos/relacionados.ts";

export const ARQUIVO = new URL("../../app/nacoes-unidas/produtos/dados/descricoes-pesquisa.json", import.meta.url);
const IMAGENS = new URL("../../app/nacoes-unidas/produtos/imagens.ts", import.meta.url);
// Mesma lista do teste: promessa de efeito não entra, venha de onde vier.
export const PROMESSAS = /\bcura\w*|\btrata\w*|\btratamento|\balivia\w*|\bprev[eé]m\w*|\bcombat\w*|\bclinicamente|\bcomprovad\w*|\beficaz\w*|\bgarant\w*|\bhipoalerg\w*|\bdermatologicamente|\bsem efeitos?\b|\b\d+ ?horas\b|\bpara que serve\b|R\$|[!?]/i;

const sa = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function lerCsv(texto) {
  const t = texto.replace(/^﻿/, "");
  const primeira = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].map((s) => [s, primeira.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  linha.push(campo);
  if (linha.some((x) => x.trim())) linhas.push(linha);
  return linhas;
}

function colunas(cab) {
  const h = cab.map(sa);
  const acha = (...nomes) => h.findIndex((x) => nomes.some((n) => x === n || x.includes(n)));
  return {
    ean: acha("codigo de barras", "cod barras", "ean", "gtin", "barras"),
    desc: acha("descricao", "descricao completa", "texto", "detalhes", "sobre"),
    fonte: acha("fonte", "link", "url"),
  };
}

export function mapaEan() {
  const t = readFileSync(IMAGENS, "utf8");
  const m = new Map();
  for (const x of t.split("function normalizarNome")[0].matchAll(/^\s*"([^"]+)":\s*"(\d+)",?\s*$/gm)) m.set(x[1].toUpperCase().replace(/\s+/g, " ").trim(), x[2]);
  return m;
}

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const semZeros = (v) => v.replace(/^0+/, "");

/** Cruza a planilha com o catálogo. Devolve {aceitas, recusadas}; não grava nada. */
export function analisarPlanilha(csv, { fonte, existentes = {}, substituir = false, hoje = new Date().toISOString().slice(0, 10) } = {}) {
  const linhas = lerCsv(csv);
  if (!linhas.length) throw new Error("planilha vazia");
  const c = colunas(linhas[0]);
  if (c.ean < 0 || c.desc < 0) throw new Error(`não achei as colunas de código de barras e descrição no cabeçalho: ${linhas[0].join(" | ")}`);
  const nomes = mapaEan();
  const porEan = new Map();
  for (const item of carregarCatalogoNacoes().itens) {
    const e = nomes.get(item.nome.toUpperCase().replace(/\s+/g, " ").trim());
    if (e) porEan.set(semZeros(e), item);
  }
  const aceitas = {}, recusadas = [];
  linhas.slice(1).forEach((l, n) => {
    const ean = semZeros(soDigitos(l[c.ean]));
    const texto = String(l[c.desc] ?? "").replace(/\s+/g, " ").trim();
    const link = (c.fonte >= 0 ? String(l[c.fonte] ?? "").trim() : "") || fonte || "";
    const nlin = n + 2;
    const no = (motivo) => recusadas.push({ linha: nlin, ean, motivo });
    if (!ean) return no("sem código de barras");
    const item = porEan.get(ean);
    if (!item) return no("código não está no catálogo");
    const slug = slugify(item.nome);
    if (item.isMIP) return no("medicamento: só com decisão do responsável técnico");
    if (ehNbcal(item.nome) || ehFormulaInfantil(item.nome)) return no("NBCAL/fórmula infantil: só com decisão do responsável técnico");
    if (texto.length < 20 || texto.length > 600) return no("texto fora de 20 a 600 caracteres");
    const p = PROMESSAS.exec(texto);
    if (p) return no(`promessa de efeito ("${p[0]}")`);
    if (!/^https:\/\//.test(link)) return no("sem fonte https (use --fonte ou a coluna fonte)");
    if (existentes[slug] && !substituir) return no("já tem descrição pesquisada (use --substituir)");
    if (aceitas[slug]) return no("código repetido na planilha");
    aceitas[slug] = { t: texto, fonte: link, quando: hoje, conf: "media" };
  });
  return { aceitas, recusadas };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const arq = args.find((a) => !a.startsWith("--"));
  const valor = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
  if (!arq) { console.error("Informe o arquivo CSV da planilha."); process.exit(1); }
  const existentes = JSON.parse(readFileSync(ARQUIVO, "utf8"));
  const { aceitas, recusadas } = analisarPlanilha(readFileSync(arq, "utf8"), { fonte: valor("--fonte"), existentes, substituir: args.includes("--substituir") });
  console.log(`Aceitas: ${Object.keys(aceitas).length} | Recusadas: ${recusadas.length}`);
  const porMotivo = {};
  for (const r of recusadas) porMotivo[r.motivo.replace(/\(.*\)/, "")] = (porMotivo[r.motivo.replace(/\(.*\)/, "")] ?? 0) + 1;
  for (const [m, q] of Object.entries(porMotivo).sort((a, b) => b[1] - a[1])) console.log(`  ${q} × ${m}`);
  if (args.includes("--aplicar")) {
    const novo = Object.fromEntries(Object.entries({ ...existentes, ...aceitas }).sort(([a], [b]) => (a < b ? -1 : 1)));
    writeFileSync(ARQUIVO, JSON.stringify(novo, null, 1) + "\n");
    console.log(`Gravado em descricoes-pesquisa.json (${Object.keys(novo).length} no total). Rode npm test antes de publicar.`);
  } else console.log("Simulação: nada foi gravado. Acrescente --aplicar para gravar.");
}
