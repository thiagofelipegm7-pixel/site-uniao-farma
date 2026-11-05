// Utilidades dos scripts offline de IA do catálogo (descrições e pares). Rodam fora do site: nada daqui roda por visita.
import { readFileSync } from "node:fs";
import { elegivelParaPares, ehFormulaInfantil, ehDeIngerir } from "../../app/nacoes-unidas/produtos/relacionados.ts";
import { ehNbcal } from "../../app/nacoes-unidas/produtos/produto.ts";
import { nomeDeExibicao } from "../../app/nome-exibicao.ts";

export const MODELO = "@cf/google/gemma-4-26b-a4b-it";
export { elegivelParaPares, ehFormulaInfantil, ehDeIngerir, ehNbcal, nomeDeExibicao };

export function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function carregarItens() {
  const bruto = JSON.parse(readFileSync(new URL("../../app/nacoes-unidas/produtos/dados/catalogo-nacoes.json", import.meta.url), "utf8"));
  const vistos = new Set();
  const itens = [];
  for (const i of bruto.itens) {
    if (!i?.nome || !(i.preco > 0)) continue;
    const slug = slugify(i.nome);
    if (vistos.has(slug)) continue; // a página abre o primeiro item de cada slug
    vistos.add(slug);
    itens.push({ slug, nome: i.nome, exibicao: nomeDeExibicao(i.nome), lab: i.lab ?? "", categoria: i.categoria, isMIP: i.isMIP === true });
  }
  return itens;
}

/** Tira o que o modelo costuma devolver em volta do JSON (cercas de código, texto antes e depois). */
export function extrairJson(texto) {
  const t = String(texto ?? "").replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1));
  } catch {
    return null;
  }
}

export function conteudoDaResposta(r) {
  const res = r?.result ?? r;
  return res?.choices?.[0]?.message?.content ?? res?.response ?? "";
}
