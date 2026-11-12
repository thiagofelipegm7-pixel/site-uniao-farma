/**
 * Escolha dos produtos que aparecem nas vitrines da home. Antes entravam os primeiros do catálogo em ordem alfabética (seis absorventes
 * da mesma marca em fila). Agora cada item ganha pontos pelo que torna a vitrine boa de olhar e de comprar, e a lista final evita repetir
 * marca e família de produto. Tudo sai de dados que o site já tem (foto, marca, preço, estoque, descrição): nada é digitado à mão.
 */
import { nomeSuspeito } from "../../fotos-painel";

/** Marcas que o cliente reconhece de longe (as mesmas das faixas de marcas). Peso maior nas de consumo diário. */
const MARCAS_FORTES = ["dove", "nivea", "rexona", "seda", "pantene", "colgate", "neutrogena", "cerave", "cetaphil", "granado", "johnson", "sundown", "always", "pampers", "oral-b", "oral b", "sensodyne", "listerine", "tresemme", "garnier", "loreal", "l'oreal", "monange", "intimus", "gillette", "axe", "lux", "protex", "hinode", "vasenol", "cicatricure"];
const MARCAS_CONHECIDAS = ["wella", "embelleze", "salon line", "skala", "bio extratus", "farmax", "babysec", "isababy", "personal", "kuka", "buba", "cimed", "ems", "ache", "eurofarma", "neo quimica", "medley", "natulab", "teuto", "geolab", "cosmed", "cremer", "missner", "impala", "risque", "niely", "alta moda", "dentil", "bozzano", "condor", "hillo"];

/** Itens de uso prático que não chamam atenção numa vitrine (e o autoteste de covid, que fica de fora até o registro na Anvisa ser conferido). */
const POUCO_ATRATIVOS = /seringa|agulha|oxigenada|amonia|soro fisiologico|atadura|curativo|algodao|gaze|esparadrapo|luva|termometro|autoteste|covid|coletor|alcool|iodo|mercurocromo|preservativo|\bpres\b|lubrificante|fita |bolsa termica|nebuliz|aparelho de pressao/;
/** Produtos de beleza e cuidado pessoal, o que mais combina com uma vitrine de fotos. */
const BELEZA = /shampoo|condicionador|hidratante|protetor solar|serum|sabonete|creme|locao|perfume|desodorante|mascara|oleo|batom|esmalte|absorvente|fralda|escova dental|creme dental|enxaguante/;

export type ItemAtrativo = {
  nome: string;
  slug: string;
  lab: string;
  precoCentavos: number;
  foto: string | null;
  /** Medicamento sem receita: só entra em vitrine mista se faltar outra coisa melhor (a vitrine de Medicamentos não é mista). */
  isMIP?: boolean;
  /** 1 a 5 unidades: não vale promover o que está acabando. */
  restam?: number;
  /** A página do produto tem descrição de pesquisa ou da equipe (texto de verdade, não o padrão). */
  descricaoReal: boolean;
};

function minusculo(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function contem(base: string, lista: readonly string[]): boolean {
  return lista.some((m) => base.includes(m));
}

/** Variação que muda de um dia para o outro (a vitrine não fica parada), de 0 a 7, estável durante o dia. */
export function variacaoDoDia(slug: string, dia: string): number {
  let h = 2166136261;
  for (const c of `${dia}|${slug}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 8;
}

export function pontuar(item: ItemAtrativo, dia: string, vitrineDeMedicamentos = false): number {
  if (!item.foto) return -1000; // sem foto não entra na vitrine
  const base = minusculo(`${item.lab} ${item.nome}`);
  let pontos = 0;
  if (contem(base, MARCAS_FORTES)) pontos += 40;
  else if (contem(base, MARCAS_CONHECIDAS)) pontos += 22;
  if (item.descricaoReal) pontos += 14;
  const reais = item.precoCentavos / 100;
  if (reais >= 8 && reais <= 90) pontos += 12;
  else if (reais < 4) pontos -= 25;
  else if (reais < 8) pontos += 2;
  else if (reais > 180) pontos -= 12;
  if (POUCO_ATRATIVOS.test(base)) pontos -= 45;
  else if (BELEZA.test(base)) pontos += 8;
  if (nomeSuspeito(item.nome) || /\*|\(e\)/.test(item.nome.toLowerCase())) pontos -= 40;
  if (item.restam && item.restam > 0) pontos -= 30;
  if (item.isMIP && !vitrineDeMedicamentos) pontos -= 25;
  if (/\bbala\b|chocolate|\bgoma\b/.test(base)) pontos -= 25;
  return pontos + variacaoDoDia(item.slug, dia);
}

/** Primeiras duas palavras do nome sem números: "Absorvente Always" para todas as variações de tamanho e quantidade. */
function familia(nome: string): string {
  return minusculo(nome).replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean).slice(0, 2).join(" ");
}

/** Escolhe até n itens: os de maior pontuação, no máximo 2 por marca e 1 por família de produto. */
export function escolherAtrativos<T extends ItemAtrativo>(itens: readonly T[], n: number, dia: string, vitrineDeMedicamentos = false): T[] {
  const ranqueados = itens.map((i) => ({ i, p: pontuar(i, dia, vitrineDeMedicamentos) })).filter((x) => x.p > -1000).sort((a, b) => b.p - a.p || a.i.nome.localeCompare(b.i.nome, "pt-BR"));
  const porMarca = new Map<string, number>();
  const familias = new Set<string>();
  const saida: T[] = [];
  for (const { i } of ranqueados) {
    const marca = minusculo(i.lab).trim() || familia(i.nome);
    const fam = familia(i.nome);
    if ((porMarca.get(marca) ?? 0) >= 2 || familias.has(fam)) continue;
    porMarca.set(marca, (porMarca.get(marca) ?? 0) + 1);
    familias.add(fam);
    saida.push(i);
    if (saida.length === n) return saida;
  }
  // Faltou item com a regra de variedade (categoria pequena): completa com os melhores que sobraram.
  for (const { i } of ranqueados) {
    if (saida.length === n) break;
    if (!saida.includes(i)) saida.push(i);
  }
  return saida;
}
