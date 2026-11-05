import receitaEstatica from "./dados/receita-nacoes.json" with { type: "json" };
import { normalizarBusca } from "./busca";

/**
 * Medicamentos com receita, controlados e itens "consulte o farmacêutico": LISTA DE PREÇOS, sem venda online, sem cesta, sem oferta, sem destaque.
 * Fonte: JSON estático (export do DMaster + tarja, princípio ativo e registro da lista pública CMED/Anvisa; ver ops/catalogo-nacoes/gerar.py).
 * Princípio ativo, registro (RMS) e tarja só aparecem quando vêm de vínculo seguro com a CMED/Anvisa (ou, no caso do ativo dos controlados, da
 * Portaria 344). Nada é inventado: sem fonte, o campo some.
 */
export const IMAGEM_GENERICA = "/produtos/generica-ilustrativa.webp";
export const AVISO_RECEITA = "Venda sob prescrição médica";
export const AVISO_RETENCAO = "Venda sob prescrição médica com retenção da receita";
export const AVISO_CONTROLADO = "Venda sob prescrição médica com retenção da receita";
export const AVISO_CONSULTE = "Consulte o farmacêutico";
export const SELO_CONTROLADO = "Controlado";
export const NOTA_IMAGEM = "Imagem meramente ilustrativa.";
export const COMO_COMPRAR = "Sem venda online: a compra é na loja ou combinada pelo WhatsApp, com a receita.";
export const COMO_COMPRAR_CONSULTE = "Sem venda online: fale com o farmacêutico, na loja ou pelo WhatsApp.";
export const POR_PAGINA = 48;

export type TipoRestrito = "receita" | "controlados" | "consulte";
export type Tarja = "preta" | "vermelha" | "vermelha-retencao";

export const ROTULO_TARJA: Record<Tarja, string> = {
  preta: "Tarja preta",
  vermelha: "Tarja vermelha",
  "vermelha-retencao": "Tarja vermelha, com retenção da receita",
};

type BaseJson = { nome: string; lab: string; preco: number | null; ativo?: string; rms?: string; tarja?: Tarja; generico?: boolean };
export type ItemReceita = BaseJson & { retencao: boolean };
export type ItemControlado = BaseJson & { lista: string };
export type ItemConsulte = BaseJson;
export type ItemRestrito = {
  nome: string;
  lab: string;
  preco: number | null;
  tipo: TipoRestrito;
  /** Princípio ativo (CMED/Anvisa ou Portaria 344), só quando há fonte. */
  ativo: string | null;
  /** Registro no Ministério da Saúde (RMS, 9 dígitos do registro, formato 1.2345.6789), só quando vem da CMED/Anvisa. */
  rms: string | null;
  /** Tarja do medicamento, só quando vem da CMED/Anvisa ou da lista da Portaria 344. */
  tarja: Tarja | null;
  /** Retenção da receita: true (sim), false (não) ou null (confirmar com o farmacêutico). */
  retencao: boolean | null;
  concentracao: string | null;
  apresentacao: string | null;
  aviso: string;
  controlado: boolean;
  /** Campos pré-calculados nos dados gerados (nome de exibição e endereço). */
  nomeExibicao?: string;
  slug?: string;
  /** Classe "genérico" no sistema da loja (define a faixa amarela "Medicamento Genérico" na ilustração). */
  generico?: boolean;
  busca?: string;
};

/** Pela Portaria 344/98: listas A e B levam tarja preta; lista C, tarja vermelha com retenção. */
export function tarjaDaLista(lista: string): Tarja | null {
  if (/^[AB]/i.test(lista)) return "preta";
  if (/^C/i.test(lista)) return "vermelha-retencao";
  return null;
}

const CONCENTRACAO = /\d+(?:[.,]\d+)?(?:\s?[+/]\s?\d+(?:[.,]\d+)?)*\s?(?:mg|mcg|g|ml|ui|%)(?:\s?\/\s?(?:ml|g|dose))?/i;

/** Concentração e apresentação lidas do próprio nome ("AMOXICILINA 500MG CX 21 CAP"). Se não der para ler, null (nunca inventa). */
export function lerNome(nome: string, lab: string): { concentracao: string | null; apresentacao: string | null } {
  let texto = nome.replace(/\s+/g, " ").trim();
  const l = lab.trim();
  if (l && texto.toUpperCase().endsWith(" " + l.toUpperCase())) texto = texto.slice(0, -l.length).trim();
  const m = CONCENTRACAO.exec(texto);
  if (!m) return { concentracao: null, apresentacao: null };
  const resto = texto.slice(m.index + m[0].length).replace(/^[\s,;-]+/, "").trim();
  return { concentracao: m[0].replace(/\s+/g, " ").toLowerCase(), apresentacao: resto.length > 0 ? resto : null };
}

function paraRestrito(base: BaseJson & { retencao?: boolean; lista?: string }, tipo: TipoRestrito): ItemRestrito {
  const { concentracao, apresentacao } = lerNome(base.nome, base.lab);
  const controlado = tipo === "controlados";
  const tarja: Tarja | null = base.tarja ?? (controlado && base.lista ? tarjaDaLista(base.lista) : null);
  let retencao: boolean | null;
  if (controlado || base.retencao === true || tarja === "preta" || tarja === "vermelha-retencao") retencao = true;
  else if (tarja === "vermelha") retencao = false;
  else retencao = null;
  const aviso = tipo === "consulte" ? AVISO_CONSULTE : controlado ? AVISO_CONTROLADO : retencao === true ? AVISO_RETENCAO : AVISO_RECEITA;
  return {
    nome: base.nome,
    lab: base.lab,
    preco: typeof base.preco === "number" && base.preco > 0 ? base.preco : null,
    tipo,
    ativo: base.ativo ? base.ativo.trim() || null : null,
    rms: base.rms ?? null,
    tarja,
    retencao,
    concentracao,
    apresentacao,
    aviso,
    controlado,
  };
}

export type CatalogoRestrito = { geradoEm: string | undefined; receita: ItemRestrito[]; controlados: ItemRestrito[]; consulte: ItemRestrito[] };

export function carregarRestritos(): CatalogoRestrito {
  const b = receitaEstatica as unknown as { geradoEm?: string; receita?: ItemReceita[]; controlados?: ItemControlado[]; consulte?: ItemConsulte[] };
  const valido = (i: { nome?: unknown }) => typeof i?.nome === "string" && i.nome.trim().length > 0;
  return {
    geradoEm: typeof b.geradoEm === "string" ? b.geradoEm : undefined,
    receita: (b.receita ?? []).filter(valido).map((i) => paraRestrito(i, "receita")),
    controlados: (b.controlados ?? []).filter(valido).map((i) => paraRestrito(i, "controlados")),
    consulte: (b.consulte ?? []).filter(valido).map((i) => paraRestrito(i, "consulte")),
  };
}

export function filtrarRestritos(itens: readonly ItemRestrito[], consulta: string): ItemRestrito[] {
  const q = normalizarBusca(consulta);
  if (!q) return [...itens];
  return itens.filter((i) => normalizarBusca(`${i.nome} ${i.lab} ${i.ativo ?? ""}`).includes(q));
}

export function paginar<T>(itens: readonly T[], pagina: number, porPagina = POR_PAGINA): { itens: T[]; pagina: number; paginas: number } {
  const paginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const p = Math.min(Math.max(1, Math.floor(pagina) || 1), paginas);
  return { itens: itens.slice((p - 1) * porPagina, p * porPagina), pagina: p, paginas };
}

// ---- Ilustração por forma do medicamento -------------------------------------------------------------------------
// Não são fotos do produto: são caixas ilustrativas da loja (faixa vermelha "Venda sob prescrição médica", amarela "Genérico",
// preta para controlados e "só pode ser vendido com retenção da receita"). A regra escolhe a mais próxima da forma
// (comprimido, cápsula, injetável, xarope, pomada, gotas, spray, inalador) e da faixa do item.
type FormaIlustracao = "cpr" | "cap" | "inj" | "liq" | "tub" | "got" | "spr" | "inal";
type BandaIlustracao = "vermelha" | "retencao" | "preta";
type Ilustracao = { arquivo: string; forma: FormaIlustracao; generico: boolean; banda: BandaIlustracao };

export const ILUSTRACOES: readonly Ilustracao[] = [
  { arquivo: "cpr-gen-vermelha", forma: "cpr", generico: true, banda: "vermelha" },
  { arquivo: "cpr-ref-vermelha", forma: "cpr", generico: false, banda: "vermelha" },
  { arquivo: "cpr-ref-retencao", forma: "cpr", generico: false, banda: "retencao" },
  { arquivo: "cpr-gen-preta", forma: "cpr", generico: true, banda: "preta" },
  { arquivo: "cap-gen-retencao", forma: "cap", generico: true, banda: "retencao" },
  { arquivo: "cap-ref-retencao", forma: "cap", generico: false, banda: "retencao" },
  { arquivo: "cap-ref-preta", forma: "cap", generico: false, banda: "preta" },
  { arquivo: "inj-gen-vermelha", forma: "inj", generico: true, banda: "vermelha" },
  { arquivo: "inj-ref-vermelha", forma: "inj", generico: false, banda: "vermelha" },
  { arquivo: "inj-ref-retencao", forma: "inj", generico: false, banda: "retencao" },
  { arquivo: "liq-gen-vermelha", forma: "liq", generico: true, banda: "vermelha" },
  { arquivo: "liq-ref-vermelha", forma: "liq", generico: false, banda: "vermelha" },
  { arquivo: "tub-gen-vermelha", forma: "tub", generico: true, banda: "vermelha" },
  { arquivo: "tub-ref-vermelha", forma: "tub", generico: false, banda: "vermelha" },
  { arquivo: "got-ref-retencao", forma: "got", generico: false, banda: "retencao" },
  { arquivo: "got-ref-preta", forma: "got", generico: false, banda: "preta" },
  { arquivo: "spr-gen-vermelha", forma: "spr", generico: true, banda: "vermelha" },
  { arquivo: "spr-ref-retencao", forma: "spr", generico: false, banda: "retencao" },
  { arquivo: "inal-ref-vermelha", forma: "inal", generico: false, banda: "vermelha" },
];

/** Palavra inteira só em letras ("30CAPS" e "CX30CPR" contam; "CAPSULA" não casa com "CAP"). */
const palavra = (alternativas: string) => new RegExp(`(?<![A-Z])(?:${alternativas})(?![A-Z])`);
const RX_INAL = palavra("INAL[A-Z]*|AEROSS?OL|HFA|DISCUS|TURBUHALER|SPRAY ORAL");
const RX_INJ = palavra("INJ[A-Z]*|AMP[A-Z]*|CANETA?|SERINGA|LIOF[A-Z]*|REFIL");
const RX_SPR = palavra("SPRAY|NASAL|SOL NAS[A-Z]*|JATO");
const RX_GOT = palavra("GOTAS?|GTS?|COLIRIO|OFT[A-Z]*|OTO[A-Z]*");
const RX_CAP = palavra("CAPS?|CAPSULAS?");
const RX_CPR = palavra("CPR|COMP[A-Z]*|DRG|DRAGEAS?");
const RX_TUB = palavra("CR|CREME|POM|POMADA|GEL|BG|DERM|LOCAO|PAST");
const RX_LIQ = palavra("XPE|XAROPE|SUSP[A-Z]*|SOL|SOLUCAO|LIQ|EMULS[A-Z]*|ELIXIR|\\d+ ?ML");

export function formaDoMedicamento(nome: string, apresentacao: string | null): FormaIlustracao {
  const t = ` ${nome} ${apresentacao ?? ""} `.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (RX_INAL.test(t)) return "inal";
  if (RX_INJ.test(t)) return "inj";
  if (RX_SPR.test(t)) return "spr";
  if (RX_GOT.test(t)) return "got";
  if (RX_CAP.test(t)) return "cap"; // cápsula gelatinosa ("CAPS GEL") é cápsula, não gel
  if (RX_CPR.test(t)) return "cpr";
  if (RX_TUB.test(t)) return "tub";
  if (RX_LIQ.test(t)) return "liq";
  return "cpr";
}

/** Caminho da ilustração mais próxima do item (receita e controlados). "Consulte o farmacêutico" usa a imagem genérica. */
export function imagemIlustrativa(item: Pick<ItemRestrito, "nome" | "apresentacao" | "tipo" | "tarja" | "retencao" | "controlado" | "generico">): string {
  if (item.tipo === "consulte") return IMAGEM_GENERICA;
  const forma = formaDoMedicamento(item.nome, item.apresentacao);
  const banda: BandaIlustracao = item.tarja === "preta" ? "preta" : item.retencao === true || item.controlado ? "retencao" : "vermelha";
  const generico = item.generico === true;
  let melhor = ILUSTRACOES[0];
  let menor = Infinity;
  for (const cand of ILUSTRACOES) {
    let custo = cand.forma === forma ? 0 : 100;
    if (cand.banda !== banda) custo += banda === "preta" || cand.banda === "preta" ? 30 : 10;
    if (cand.generico !== generico) custo += 3;
    if (custo < menor) {
      menor = custo;
      melhor = cand;
    }
  }
  return `/ilustrativas/${melhor.arquivo}.webp`;
}
