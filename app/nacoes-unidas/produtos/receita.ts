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

type BaseJson = { nome: string; lab: string; preco: number | null; ativo?: string; rms?: string; tarja?: Tarja };
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
