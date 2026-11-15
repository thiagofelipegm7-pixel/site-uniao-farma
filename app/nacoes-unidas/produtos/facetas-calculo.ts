/**
 * Filtros da lateral que mudam conforme a busca (facetas). Cada seção só usa campos que existem no índice da busca
 * (departamento, categoria, marca/laboratório, preço, estoque; para medicamentos com receita: tipo de venda, genérico e
 * princípio ativo). Tamanho, quantidade, dosagem e forma saem do nome só quando o nome traz a unidade escrita
 * ("200ml", "30 comprimidos", "500mg"); se o nome não diz, o produto fica sem esse valor (nada é adivinhado).
 *
 * As contagens seguem o padrão de loja: cada seção conta os produtos da busca com os OUTROS filtros aplicados,
 * então marcar uma marca não zera as outras marcas, mas muda as contagens de categoria e preço.
 */
import { normalizarBusca, precoDoItem, ORDENS_CATALOGO, type GrupoBusca, type ItemBusca, type OrdemCatalogo } from "./busca";
import { formatarQuantidade, quantidadeDoNome } from "./quantidade";

export type FacetaId =
  | "departamento"
  | "categoria"
  | "marca"
  | "venda"
  | "generico"
  | "ativo"
  | "forma"
  | "dosagem"
  | "tamanho"
  | "quantidade"
  | "disponibilidade";

export type Selecoes = Partial<Record<FacetaId, readonly string[]>>;

export type FiltrosLista = {
  selecoes: Selecoes;
  /** Preço em reais, inclusive. */
  precoMin?: number;
  precoMax?: number;
};

export type OpcaoFaceta = { valor: string; label: string; contagem: number; selecionada: boolean };
export type Faceta = { id: FacetaId; titulo: string; opcoes: OpcaoFaceta[] };

type Definicao = {
  id: FacetaId;
  titulo: string;
  /** Nome do parâmetro no endereço (?marca=...). */
  param: string;
  valores: (item: ItemBusca, departamento: string) => string[];
  /** Ordem das opções. Padrão: mais produtos primeiro. */
  ordem?: "contagem" | "numerica" | "fixa";
  fixa?: readonly string[];
  /** Seção de medicamento: só aparece quando todos os produtos da lista são do departamento Medicamentos. */
  soMedicamentos?: boolean;
};

const MEDICAMENTOS = "medicamentos";
const ehMedicamento = (departamento: string) => normalizarBusca(departamento) === MEDICAMENTOS;

export const VENDA_SEM_RECEITA = "Sem receita";
export const VENDA_COM_RECEITA = "Com receita";
export const VENDA_CONTROLADO = "Controlado";

function primeiraMaiuscula(texto: string): string {
  const t = texto.trim();
  return t ? t.charAt(0).toLocaleUpperCase("pt-BR") + t.slice(1) : t;
}

/** "060 g" vira "60 g"; "1,0 L" fica como está. */
function semZeroNaFrente(texto: string): string {
  return texto.replace(/^0+(?=\d)/, "");
}

/** Kits e combinações ("Shampoo 300ml + Condicionador 190ml") têm mais de um tamanho: ficam sem valor. */
function ehCombinacao(nome: string): boolean {
  return /\bkit\b|\+/i.test(nome);
}

const MEDIDA = /^(\d+(?:,\d+)?) (ml|g|L|kg)$/;
const CONTAGEM = /^(\d+) (comprimidos?|cápsulas?|drágeas?|envelopes?|sachês?|ampolas?|doses?|unidades?|pares?|par|peças?|folhas?|tiras?)$/;

/** Volume ou peso escrito no nome ("200ml" → "200 ml"). */
export function tamanhoDoNome(nome: string): string | null {
  if (ehCombinacao(nome)) return null;
  const t = quantidadeLimpa(nome);
  return t && MEDIDA.test(t) ? t : null;
}

/** Quantidade do nome sem a concentração ("400MG/5ML" não vira "5 ml") e sem zero à esquerda ("060g" → "60 g"). */
function quantidadeLimpa(nome: string): string | null {
  const semConcentracao = nome.replace(new RegExp(DOSE_RX.source, "gi"), " ");
  const q = quantidadeDoNome(semConcentracao);
  return q ? formatarQuantidade(semZeroNaFrente(q)) : null;
}

/** Contagem escrita no nome ("Cx 30 comprimidos" → "30 comprimidos"). */
export function quantidadeContadaDoNome(nome: string): string | null {
  if (ehCombinacao(nome)) return null;
  const t = quantidadeLimpa(nome);
  return t && CONTAGEM.test(t) ? t : null;
}

const DOSE_RX = /(?<![\d.,a-z])(\d+(?:[.,]\d+)?)\s*(mg|mcg|ui|%)(?:\s*\/\s*(\d+(?:[.,]\d+)?)?\s*(ml|g|gotas?|doses?))?(?![a-z])/gi;

/**
 * Concentração escrita no nome de um medicamento ("500mg", "50MG/ML", "400MG/5ML", "5%").
 * Associação ("0.15+0.03MG"), duas concentrações diferentes ou zero à esquerda ambíguo ("010%") ficam sem valor.
 */
export function dosagemDoNome(nome: string): string | null {
  if (nome.includes("+")) return null;
  const achadas = new Set<string>();
  for (const m of nome.matchAll(DOSE_RX)) {
    // "010%" e "2.500MCG" são ambíguos (0,10 ou 10? 2,5 ou 2500?): sem valor.
    if (/^0\d/.test(m[1]) || /^\d{1,3}\.\d{3}$/.test(m[1])) return null;
    const numero = m[1].replace(".", ",");
    const unidade = m[2].toLowerCase() === "ui" ? "UI" : m[2].toLowerCase();
    const por = m[4] ? `/${m[3] ? m[3].replace(".", ",") : ""}${m[4].toLowerCase()}` : "";
    achadas.add(unidade === "%" ? `${numero}%` : `${numero} ${unidade}${por}`);
  }
  return achadas.size === 1 ? [...achadas][0] : null;
}

/** Palavras que dizem a forma, como o sistema da loja escreve. Uma palavra de cada forma; duas formas diferentes = sem valor. */
const FORMAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(?:comprimidos?|comp|cpr|cprs|cp)\b/i, "Comprimido"],
  [/\b(?:c[aá]psulas?|caps|cap)\b/i, "Cápsula"],
  [/\b(?:dr[aá]geas?|drg)\b/i, "Drágea"],
  [/\bgotas\b/i, "Gotas"],
  [/\b(?:xarope|xpe|xrp)\b/i, "Xarope"],
  [/\bsuspens[aã]o\b/i, "Suspensão"],
  [/\bpomada\b/i, "Pomada"],
  [/\bcreme\b/i, "Creme"],
  [/\bspray\b/i, "Spray"],
  [/\b(?:sach[eê]s?|envelopes?)\b/i, "Sachê ou envelope"],
  [/\b(?:ampolas?|injet[aá]vel)\b/i, "Injetável"],
];

/** Forma do medicamento, só quando o nome traz uma única forma escrita. */
export function formaDoNome(nome: string): string | null {
  const achadas = new Set<string>();
  for (const [rx, forma] of FORMAS) if (rx.test(nome)) achadas.add(forma);
  return achadas.size === 1 ? [...achadas][0] : null;
}

export const FACETAS: readonly Definicao[] = [
  { id: "departamento", titulo: "Departamento", param: "departamento", valores: (_i, dep) => (dep ? [dep] : []) },
  { id: "categoria", titulo: "Categoria", param: "categoria", valores: (i) => (i.tipo?.trim() ? [i.tipo.trim()] : []) },
  { id: "marca", titulo: "Marca", param: "marca", valores: (i) => (i.lab.trim() ? [i.lab.trim()] : []) },
  {
    id: "venda",
    soMedicamentos: true,
    titulo: "Tipo de venda",
    param: "venda",
    ordem: "fixa",
    fixa: [VENDA_SEM_RECEITA, VENDA_COM_RECEITA, VENDA_CONTROLADO],
    // Só dentro de Medicamentos, e sem destaque: é um filtro neutro, na ordem "sem receita" primeiro.
    valores: (i, dep) => {
      if (!ehMedicamento(dep)) return [];
      if (!i.restrito) return [VENDA_SEM_RECEITA];
      return [i.restrito.controlado || i.restrito.tipo === "controlados" ? VENDA_CONTROLADO : VENDA_COM_RECEITA];
    },
  },
  {
    id: "generico",
    soMedicamentos: true,
    titulo: "Genérico",
    param: "generico",
    ordem: "fixa",
    fixa: ["Genérico", "Não genérico"],
    // O campo existe só nos medicamentos com receita; nos demais não sabemos, então ficam fora.
    valores: (i) => (i.restrito && typeof i.restrito.generico === "boolean" ? [i.restrito.generico ? "Genérico" : "Não genérico"] : []),
  },
  {
    id: "ativo",
    soMedicamentos: true,
    titulo: "Princípio ativo",
    param: "ativo",
    // Associações vêm separadas por ";" no cadastro: "Etinilestradiol + gestodeno".
    valores: (i) => (i.restrito?.ativo?.trim() ? [primeiraMaiuscula(i.restrito.ativo.split(";").map((p) => p.trim()).filter(Boolean).join(" + "))] : []),
  },
  { id: "forma", soMedicamentos: true, titulo: "Forma farmacêutica", param: "forma", valores: (i, dep) => { const f = ehMedicamento(dep) ? formaDoNome(i.nome) : null; return f ? [f] : []; } },
  { id: "dosagem", soMedicamentos: true, titulo: "Dosagem", param: "dosagem", ordem: "numerica", valores: (i, dep) => { const d = ehMedicamento(dep) ? dosagemDoNome(i.nome) : null; return d ? [d] : []; } },
  { id: "tamanho", titulo: "Tamanho", param: "tamanho", ordem: "numerica", valores: (i) => { const t = tamanhoDoNome(i.nome); return t ? [t] : []; } },
  { id: "quantidade", titulo: "Quantidade", param: "quantidade", ordem: "numerica", valores: (i) => { const q = quantidadeContadaDoNome(i.nome); return q ? [q] : []; } },
  { id: "disponibilidade", titulo: "Disponibilidade", param: "disponibilidade", ordem: "fixa", fixa: ["Disponíveis", "Esgotados"], valores: (i) => [i.esgotado ? "Esgotados" : "Disponíveis"] },
];

const POR_ID = new Map(FACETAS.map((f) => [f.id, f]));

type Entrada = { item: ItemBusca; departamento: string; chaves: Map<FacetaId, string[]>; labels: Map<FacetaId, string[]> };

/** Valores de cada produto, calculados uma vez por produto (a lista muda a cada letra digitada). */
const cache = new WeakMap<ItemBusca, Map<string, Entrada>>();

function entradaDe(item: ItemBusca, departamento: string): Entrada {
  let porDep = cache.get(item);
  if (!porDep) {
    porDep = new Map();
    cache.set(item, porDep);
  }
  const pronta = porDep.get(departamento);
  if (pronta) return pronta;
  const chaves = new Map<FacetaId, string[]>();
  const labels = new Map<FacetaId, string[]>();
  for (const f of FACETAS) {
    const vals = f.valores(item, departamento);
    labels.set(f.id, vals);
    chaves.set(f.id, vals.map(normalizarBusca));
  }
  const e = { item, departamento, chaves, labels };
  porDep.set(departamento, e);
  return e;
}

function selecaoNormalizada(selecoes: Selecoes): Map<FacetaId, Set<string>> {
  const m = new Map<FacetaId, Set<string>>();
  for (const f of FACETAS) {
    const vals = (selecoes[f.id] ?? []).map(normalizarBusca).filter(Boolean);
    if (vals.length > 0) m.set(f.id, new Set(vals));
  }
  return m;
}

function passaPreco(item: ItemBusca, min?: number, max?: number): boolean {
  if (min === undefined && max === undefined) return true;
  const p = precoDoItem(item);
  // Sem preço ("Consulte") não entra quando o cliente pediu uma faixa.
  if (p <= 0) return false;
  if (min !== undefined && p < min) return false;
  if (max !== undefined && p > max) return false;
  return true;
}

function passa(e: Entrada, sel: Map<FacetaId, Set<string>>, filtros: FiltrosLista, exceto?: FacetaId): boolean {
  for (const [id, valores] of sel) {
    if (id === exceto) continue;
    const doItem = e.chaves.get(id) ?? [];
    if (!doItem.some((v) => valores.has(v))) return false;
  }
  return passaPreco(e.item, filtros.precoMin, filtros.precoMax);
}

/** Predicado para `aplicarCatalogo`: o produto passa em todas as seções marcadas e na faixa de preço. */
export function predicadoFiltros(filtros: FiltrosLista): (item: ItemBusca, departamento: string) => boolean {
  const sel = selecaoNormalizada(filtros.selecoes);
  if (sel.size === 0 && filtros.precoMin === undefined && filtros.precoMax === undefined) return () => true;
  return (item, departamento) => passa(entradaDe(item, departamento), sel, filtros);
}

function numeroDe(label: string): number {
  const m = /^(\d+(?:,\d+)?)/.exec(label);
  return m ? Number(m[1].replace(",", ".")) : Number.POSITIVE_INFINITY;
}

/** Litros e quilos contam como mil ml/g para a ordem ficar natural (500 ml antes de 1 L). */
function ordemNumerica(label: string): [string, number] {
  const n = numeroDe(label);
  const m = /\s(\S+)$/.exec(label);
  const u = m ? m[1] : label.replace(/^[\d,]+/, "");
  if (u === "L") return ["ml", n * 1000];
  if (u === "kg") return ["g", n * 1000];
  return [u, n];
}

/**
 * Seções da lateral para os produtos que a busca achou (`grupos` já filtrados pelo texto).
 * Seção com menos de 2 opções some (a não ser que tenha algo marcado, para o cliente poder desmarcar). Opção com zero some.
 */
export function calcularFacetas(grupos: readonly GrupoBusca[], filtros: FiltrosLista): Faceta[] {
  const entradas: Entrada[] = [];
  const ordemDep = new Map<string, number>();
  for (const g of grupos) {
    const chaveDep = normalizarBusca(g.categoria);
    if (!ordemDep.has(chaveDep)) ordemDep.set(chaveDep, ordemDep.size);
    for (const item of g.itens) entradas.push(entradaDe(item, g.categoria));
  }
  const sel = selecaoNormalizada(filtros.selecoes);
  // Tipo de venda, genérico, princípio ativo, forma e dosagem só quando a lista é toda de Medicamentos (nunca em destaque fora dela).
  const visiveis = entradas.filter((e) => passa(e, sel, filtros));
  const soMedicamentos = visiveis.length > 0 && visiveis.every((e) => ehMedicamento(e.departamento));
  const saida: Faceta[] = [];
  for (const f of FACETAS) {
    if (f.soMedicamentos && !soMedicamentos && !sel.has(f.id)) continue;
    const contagem = new Map<string, number>();
    const rotulos = new Map<string, Map<string, number>>();
    for (const e of entradas) {
      if (!passa(e, sel, filtros, f.id)) continue;
      const chaves = e.chaves.get(f.id) ?? [];
      const labels = e.labels.get(f.id) ?? [];
      chaves.forEach((c, k) => {
        contagem.set(c, (contagem.get(c) ?? 0) + 1);
        const r = rotulos.get(c) ?? new Map<string, number>();
        r.set(labels[k], (r.get(labels[k]) ?? 0) + 1);
        rotulos.set(c, r);
      });
    }
    const marcadas = sel.get(f.id) ?? new Set<string>();
    const opcoes: OpcaoFaceta[] = [...contagem.entries()].map(([valor, n]) => {
      // Mesma marca escrita de jeitos diferentes ("Nivea", "NIVEA"): mostra a grafia mais comum.
      const label = [...(rotulos.get(valor) ?? new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))[0]?.[0] ?? valor;
      return { valor: label, label, contagem: n, selecionada: marcadas.has(valor) };
    });
    // O que está marcado e sumiu da busca continua na lista (com zero) para poder desmarcar.
    for (const v of filtros.selecoes[f.id] ?? []) {
      if (!contagem.has(normalizarBusca(v))) opcoes.push({ valor: v, label: v, contagem: 0, selecionada: true });
    }
    ordenarOpcoes(f, opcoes, ordemDep);
    const comProdutos = opcoes.filter((o) => o.contagem > 0);
    if (comProdutos.length < 2 && marcadas.size === 0) continue;
    saida.push({ id: f.id, titulo: f.titulo, opcoes });
  }
  return saida;
}

function ordenarOpcoes(f: Definicao, opcoes: OpcaoFaceta[], ordemDep: Map<string, number>): void {
  const alfa = (a: OpcaoFaceta, b: OpcaoFaceta) => a.label.localeCompare(b.label, "pt-BR");
  if (f.id === "departamento") {
    opcoes.sort((a, b) => (ordemDep.get(normalizarBusca(a.valor)) ?? 99) - (ordemDep.get(normalizarBusca(b.valor)) ?? 99));
    return;
  }
  if (f.ordem === "fixa" && f.fixa) {
    const pos = (o: OpcaoFaceta) => { const i = f.fixa!.indexOf(o.valor); return i < 0 ? 99 : i; };
    opcoes.sort((a, b) => pos(a) - pos(b) || alfa(a, b));
    return;
  }
  if (f.ordem === "numerica") {
    opcoes.sort((a, b) => {
      const [ua, na] = ordemNumerica(a.label);
      const [ub, nb] = ordemNumerica(b.label);
      return ua.localeCompare(ub, "pt-BR") || na - nb || alfa(a, b);
    });
    return;
  }
  // Mais produtos primeiro; "Outros" sempre no fim.
  opcoes.sort((a, b) => Number(a.valor === "Outros") - Number(b.valor === "Outros") || b.contagem - a.contagem || alfa(a, b));
}

/** Menor e maior preço dos produtos da busca (com os outros filtros), para o exemplo dos campos Mínimo e Máximo. */
export function faixaDePrecos(grupos: readonly GrupoBusca[], filtros: FiltrosLista): { min: number; max: number } | null {
  const sel = selecaoNormalizada(filtros.selecoes);
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const g of grupos) {
    for (const item of g.itens) {
      if (!passa(entradaDe(item, g.categoria), sel, { selecoes: filtros.selecoes })) continue;
      const p = precoDoItem(item);
      if (p <= 0) continue;
      if (p < min) min = p;
      if (p > max) max = p;
    }
  }
  return max > 0 ? { min, max } : null;
}

export function contarSelecionados(filtros: FiltrosLista): number {
  let n = 0;
  for (const f of FACETAS) n += filtros.selecoes[f.id]?.length ?? 0;
  if (filtros.precoMin !== undefined || filtros.precoMax !== undefined) n += 1;
  return n;
}

/** "12,5" ou "12.50" ou "R$ 12" → 12.5. Vazio → undefined. Texto que não é número → NaN (o formulário avisa). */
export function lerPrecoDigitado(texto: string): number | undefined {
  const t = texto.replace(/r\$\s*/i, "").trim();
  if (!t) return undefined;
  if (!/^\d{1,6}(?:[.,]\d{1,2})?$/.test(t)) return Number.NaN;
  return Number(t.replace(",", "."));
}

/** Confere mínimo e máximo digitados. Devolve a faixa ou a mensagem de erro para mostrar ao lado dos campos. */
export function validarFaixa(minTexto: string, maxTexto: string): { ok: true; min?: number; max?: number } | { ok: false; erro: string } {
  const min = lerPrecoDigitado(minTexto);
  const max = lerPrecoDigitado(maxTexto);
  if (Number.isNaN(min) || Number.isNaN(max)) return { ok: false, erro: "Digite só números, como 10 ou 10,50." };
  if (min !== undefined && max !== undefined && min > max) return { ok: false, erro: "O mínimo não pode ser maior que o máximo." };
  return { ok: true, min, max };
}

export function formatarReais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",").replace(/,00$/, "")}`;
}

/* ---------- Endereço (?marca=Nivea&preco_min=10): link e botão Voltar funcionam ---------- */

const PARAM_MIN = "preco_min";
const PARAM_MAX = "preco_max";
const PARAM_ORDEM = "ordem";
const ORDENS = new Set<string>(ORDENS_CATALOGO.map((o) => o.id));
const LIMITE_VALORES = 30;

export type EstadoUrl = FiltrosLista & { ordem: OrdemCatalogo };

export function filtrosDaUrl(search: string): EstadoUrl {
  const p = new URLSearchParams(search);
  const selecoes: Selecoes = {};
  for (const f of FACETAS) {
    const vals = [...new Set(p.getAll(f.param).map((v) => v.trim().slice(0, 80)).filter(Boolean))].slice(0, LIMITE_VALORES);
    if (vals.length > 0) selecoes[f.id] = vals;
  }
  const num = (nome: string) => {
    const v = lerPrecoDigitado(p.get(nome) ?? "");
    return v === undefined || Number.isNaN(v) ? undefined : v;
  };
  let precoMin = num(PARAM_MIN);
  let precoMax = num(PARAM_MAX);
  if (precoMin !== undefined && precoMax !== undefined && precoMin > precoMax) [precoMin, precoMax] = [precoMax, precoMin];
  const ordemTexto = p.get(PARAM_ORDEM) ?? "";
  const ordem = (ORDENS.has(ordemTexto) ? ordemTexto : "recomendados") as OrdemCatalogo;
  return { selecoes, ...(precoMin !== undefined ? { precoMin } : {}), ...(precoMax !== undefined ? { precoMax } : {}), ordem };
}

/** Mesmo endereço com os filtros trocados. Mantém ?q= e outros parâmetros; tira ?pagina= (lista nova começa na 1). */
export function urlComFiltros(href: string, estado: EstadoUrl): string {
  const u = new URL(href);
  for (const f of FACETAS) u.searchParams.delete(f.param);
  u.searchParams.delete(PARAM_MIN);
  u.searchParams.delete(PARAM_MAX);
  u.searchParams.delete(PARAM_ORDEM);
  u.searchParams.delete("pagina");
  for (const f of FACETAS) for (const v of estado.selecoes[f.id] ?? []) u.searchParams.append(f.param, v);
  if (estado.precoMin !== undefined) u.searchParams.set(PARAM_MIN, String(estado.precoMin));
  if (estado.precoMax !== undefined) u.searchParams.set(PARAM_MAX, String(estado.precoMax));
  if (estado.ordem && estado.ordem !== "recomendados") u.searchParams.set(PARAM_ORDEM, estado.ordem);
  return u.toString();
}

/** Assinatura dos filtros (para saber se o endereço já está certo e não empilhar histórico à toa). */
export function assinaturaFiltros(estado: EstadoUrl): string {
  return urlComFiltros("https://x.invalid/", estado);
}

export function tituloDaFaceta(id: FacetaId): string {
  return POR_ID.get(id)?.titulo ?? id;
}

/** Atalhos "Refine por" sobre a busca: as categorias com mais produtos entre os resultados (dado real, não sugestão inventada). */
export function atalhosDaBusca(facetas: readonly Faceta[], limite = 8): OpcaoFaceta[] {
  const cat = facetas.find((f) => f.id === "categoria");
  if (!cat) return [];
  return cat.opcoes.filter((o) => o.contagem > 0 && !o.selecionada && o.valor !== "Outros").slice(0, limite);
}
