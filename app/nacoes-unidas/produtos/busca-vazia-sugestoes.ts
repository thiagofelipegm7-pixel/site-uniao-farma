/**
 * Sugestões na busca vazia: 3 a 6 itens de higiene, beleza ou perfumaria, calculados no catálogo já carregado.
 * Sem rede e sem D1: o Worker Free tem só 10 ms de CPU, então a lista elegível é montada uma vez e reaproveitada.
 * Medicamento, sintoma ou material de saúde: nenhuma sugestão. Quem orienta é o farmacêutico, no WhatsApp.
 */
import { pareceSintoma } from "./busca-tolerante";
import { normalizarBusca, termosDaConsulta, type GrupoBusca, type ItemBusca } from "./busca";
import { ehNbcal } from "./produto";
import {
  CATEGORIAS_COM_PARES,
  MAX_SUGESTOES,
  MIN_SUGESTOES,
  ehDeIngerir,
  ehFormulaInfantil,
  ehSaudeOuQuimico,
  elegivelParaPares,
} from "./relacionados";
import { sintomaConhecido } from "./sintomas-otc";

export type ItemBuscaVazia = ItemBusca & { categoria: string };

/** Formas e doses típicas de remédio no texto digitado. Na dúvida, a busca fica sem sugestão. */
const FORMA_OU_DOSE = /\b(pomadas?|xaropes?|colirios?|supositorios?|ovulos?|ampolas?|injet\w*|comprimidos?|drageas?|gotas|gts|solucao oral|suspensao|elixir|generico|bula|antibioticos?|anti-?inflamator\w*|controlados?|tarja)\b|\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|ui|cps|cpr|comp)\b/;

const PEDIDO_DE_REMEDIO = /\b(remedios?|medicamentos?|antibioticos?|anti-?inflamator\w*|controlados?|tarja)\b/;

/**
 * A busca pede remédio, descreve um sintoma ou cai no filtro de saúde do "Combina com".
 * Não depende do catálogo: serve para recusar a sugestão cedo e nos testes.
 */
export function consultaBloqueiaSugestao(consulta: string): boolean {
  const texto = consulta.trim();
  if (!texto) return true;
  if (pareceSintoma(texto) || sintomaConhecido(texto)) return true;
  if (ehSaudeOuQuimico(texto) || ehDeIngerir(texto) || ehFormulaInfantil(texto) || ehNbcal(texto)) return true;
  const n = normalizarBusca(texto);
  if (FORMA_OU_DOSE.test(n) || PEDIDO_DE_REMEDIO.test(n)) return true;
  return false;
}

/** Nomes normalizados de medicamento, MIP e item restrito do catálogo já carregado (uma vez por lista). */
export function termosDeRemedioDoCatalogo(grupos: readonly GrupoBusca[]): readonly string[] {
  const nomes: string[] = [];
  for (const grupo of grupos) {
    const categoriaRemedio = grupo.categoria === "Medicamentos";
    for (const item of grupo.itens) {
      if (item.isMIP || item.restrito || categoriaRemedio) nomes.push(normalizarBusca(item.nome));
    }
  }
  return nomes;
}

/** A consulta casa com um medicamento do catálogo (ex.: "dipirona 999" ou um nome digitado que a loja vende como remédio). */
export function consultaCasaComRemedio(consulta: string, termosRemedio: readonly string[]): boolean {
  const n = normalizarBusca(consulta);
  if (!n) return false;
  const tokens = termosDaConsulta(consulta).filter((t) => t.length >= 4);
  for (const nome of termosRemedio) {
    if (nome.includes(n) || n.includes(nome)) return true;
    for (const t of tokens) if (t.length >= 4 && nome.includes(t)) return true;
  }
  return false;
}

export function itensElegiveisParaBuscaVazia(grupos: readonly GrupoBusca[]): ItemBuscaVazia[] {
  const saida: ItemBuscaVazia[] = [];
  for (const grupo of grupos) {
    if (!(CATEGORIAS_COM_PARES as readonly string[]).includes(grupo.categoria)) continue;
    for (const item of grupo.itens) {
      if (item.restrito || item.isMIP) continue;
      if (!elegivelParaPares({ nome: item.nome, categoria: grupo.categoria, isMIP: item.isMIP })) continue;
      const preco = typeof item.preco === "number" ? item.preco : 1;
      if (preco <= 0) continue;
      saida.push({ ...item, categoria: grupo.categoria });
    }
  }
  return saida;
}

function textoDoItem(item: ItemBuscaVazia): string {
  return normalizarBusca([item.nome, item.lab, item.categoria, item.tipo ?? "", item.palavras ?? ""].join(" "));
}

function pontos(item: ItemBuscaVazia, tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  const texto = textoDoItem(item);
  const categoria = normalizarBusca(item.categoria);
  const tipo = normalizarBusca(item.tipo ?? "");
  let nota = 0;
  for (const t of tokens) {
    if (texto.includes(t)) nota += 3;
    if (categoria.includes(t) || tipo.includes(t)) nota += 2;
  }
  return nota;
}

/**
 * Devolve 3 a 6 itens elegíveis, preferindo quem casa com as palavras ou a categoria buscadas.
 * Sem casamento, usa uma fatia estável do que está em estoque (a página vazia não pode ficar sem saída).
 * Menos de 3 elegíveis, ou busca bloqueada, vira lista vazia.
 */
export function sugestoesParaBuscaVazia(
  consulta: string,
  elegiveis: readonly ItemBuscaVazia[],
  termosRemedio: readonly string[] = [],
): ItemBuscaVazia[] {
  if (consultaBloqueiaSugestao(consulta) || consultaCasaComRemedio(consulta, termosRemedio)) return [];
  if (elegiveis.length < MIN_SUGESTOES) return [];
  const tokens = termosDaConsulta(consulta).filter((t) => t.length >= 3);
  const ranqueados = elegiveis
    .map((item, ordem) => ({ item, nota: pontos(item, tokens), ordem }))
    .sort((a, b) => {
      if (b.nota !== a.nota) return b.nota - a.nota;
      const estoque = Number(a.item.esgotado) - Number(b.item.esgotado);
      if (estoque !== 0) return estoque;
      return a.item.nome.localeCompare(b.item.nome, "pt-BR") || a.ordem - b.ordem;
    });
  const comNota = ranqueados.filter((r) => r.nota > 0).map((r) => r.item);
  const base = comNota.length >= MIN_SUGESTOES ? comNota : ranqueados.map((r) => r.item);
  const unicos: ItemBuscaVazia[] = [];
  const vistos = new Set<string>();
  for (const item of base) {
    const chave = item.slug || item.id || normalizarBusca(item.nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicos.push(item);
    if (unicos.length >= MAX_SUGESTOES) break;
  }
  return unicos.length >= MIN_SUGESTOES ? unicos : [];
}
