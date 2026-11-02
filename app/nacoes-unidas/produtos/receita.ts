import receitaEstatica from "./dados/receita-nacoes.json" with { type: "json" };
import { normalizarBusca } from "./busca";

/**
 * Medicamentos com receita e controlados: LISTA DE PREÇOS, sem venda online, sem cesta, sem oferta, sem destaque.
 * Fonte: JSON estático (export do DMaster, ver ops/catalogo-nacoes/gerar.py). O export não traz RMS nem princípio ativo:
 * o princípio ativo dos controlados é o identificado pelo nome (ou omitido) e o RMS nunca é inventado.
 */
export const IMAGEM_GENERICA = "/produtos/generica-ilustrativa.webp";
export const AVISO_RECEITA = "Venda sob prescrição médica";
export const AVISO_RETENCAO = "Venda sob prescrição médica com retenção da receita";
export const AVISO_CONTROLADO = "Venda sob prescrição médica com retenção da receita";
export const SELO_CONTROLADO = "Controlado";
export const NOTA_IMAGEM = "Imagem meramente ilustrativa.";
export const POR_PAGINA = 48;

export type TipoRestrito = "receita" | "controlados";

export type ItemReceita = { nome: string; lab: string; preco: number | null; retencao: boolean };
export type ItemControlado = { nome: string; lab: string; preco: number | null; ativo: string; lista: string };
export type ItemRestrito = {
  nome: string;
  lab: string;
  preco: number | null;
  tipo: TipoRestrito;
  /** Princípio ativo (só controlados, quando identificado pelo nome). */
  ativo: string | null;
  /** RMS/registro: não existe no export, então fica sempre null até haver fonte oficial. */
  rms: string | null;
  concentracao: string | null;
  apresentacao: string | null;
  aviso: string;
  controlado: boolean;
};

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

function paraRestrito(base: { nome: string; lab: string; preco: number | null }, tipo: TipoRestrito, extra: { ativo?: string; retencao?: boolean }): ItemRestrito {
  const { concentracao, apresentacao } = lerNome(base.nome, base.lab);
  const controlado = tipo === "controlados";
  return {
    nome: base.nome,
    lab: base.lab,
    preco: typeof base.preco === "number" && base.preco > 0 ? base.preco : null,
    tipo,
    ativo: controlado && extra.ativo ? extra.ativo : null,
    rms: null,
    concentracao,
    apresentacao,
    aviso: controlado ? AVISO_CONTROLADO : extra.retencao ? AVISO_RETENCAO : AVISO_RECEITA,
    controlado,
  };
}

export type CatalogoRestrito = { geradoEm: string | undefined; receita: ItemRestrito[]; controlados: ItemRestrito[] };

export function carregarRestritos(): CatalogoRestrito {
  const b = receitaEstatica as unknown as { geradoEm?: string; receita?: ItemReceita[]; controlados?: ItemControlado[] };
  const valido = (i: { nome?: unknown }) => typeof i?.nome === "string" && i.nome.trim().length > 0;
  return {
    geradoEm: typeof b.geradoEm === "string" ? b.geradoEm : undefined,
    receita: (b.receita ?? []).filter(valido).map((i) => paraRestrito(i, "receita", { retencao: i.retencao === true })),
    controlados: (b.controlados ?? []).filter(valido).map((i) => paraRestrito(i, "controlados", { ativo: i.ativo })),
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
