import { UNITS } from "../site-config";
/**
 * Reserva: lista de produtos que o cliente separa no site e fecha pelo WhatsApp da loja.
 * Nada é cobrado no site. Preço e estoque são confirmados pela loja; o pagamento é no balcão ou na entrega.
 * Guardada só no navegador (localStorage), sem conta e sem enviar nada para servidor.
 */
/** Formas de pagamento oferecidas ao cliente. O pagamento é combinado e feito pelo WhatsApp com a loja. */
export const FORMAS_PAGAMENTO = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito"] as const;

export type ModoReserva = "retirar" | "casa";

export type ReservaItem = {
  /** Chave estável: loja + nome. */
  id: string;
  unitId: string;
  nome: string;
  /** Preço unitário em centavos (inteiro, evita erro de ponto flutuante). */
  precoCentavos: number;
  /** Preço de antes ("De"), só quando a oferta confirma. Mostra o riscado e o desconto na reserva. */
  deCentavos?: number;
  /** Caixa de seleção da cesta: só os marcados entram no total e no pedido. Ausente = marcado. */
  selecionado?: boolean;
  qtd: number;
  foto?: string | null;
  /** Medicamento de venda sob prescrição ("receita") ou de controle especial ("controlado"): retirada na loja com a receita. */
  receita?: "receita" | "controlado";
};

export type ReservaEstado = { itens: ReservaItem[]; modo: ModoReserva };

export const ESTADO_VAZIO: ReservaEstado = { itens: [], modo: "retirar" };
export const MAX_POR_ITEM = 20;
const STORAGE_KEY = "uf-reserva-v1";

export function idDoItem(unitId: string, nome: string): string {
  return `${unitId}:${nome.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

/** "R$ 19,90" ou "19,90" → 1990. Devolve null se não for um preço válido. */
export function precoParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const valor = Number(normal);
  return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : null;
}

export function formatarCentavos(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const cents = String(centavos % 100).padStart(2, "0");
  return `R$ ${reais.toLocaleString("pt-BR")},${cents}`;
}

/** A cesta tem medicamento com receita ou controlado (entre os marcados)? Então só há retirada na loja, com a receita. */
export function exigeReceita(itens: readonly ReservaItem[]): boolean {
  return itens.some((i) => itemAtivo(i) && !!i.receita);
}

/** Item marcado na cesta (o padrão). */
export function itemAtivo(item: ReservaItem): boolean {
  return item.selecionado !== false;
}

export function adicionar(estado: ReservaEstado, item: Omit<ReservaItem, "qtd" | "id">, qtd = 1): ReservaEstado {
  const id = idDoItem(item.unitId, item.nome);
  const existente = estado.itens.find((i) => i.id === id);
  if (existente) return definirSelecao(definirQtd(estado, id, existente.qtd + qtd), id, true);
  if (!(item.precoCentavos > 0)) return estado;
  const novo: ReservaItem = { ...item, id, qtd: Math.min(MAX_POR_ITEM, Math.max(1, qtd)) };
  return { ...estado, itens: [...estado.itens, novo] };
}

/** Marca ou desmarca um item. */
export function definirSelecao(estado: ReservaEstado, id: string, selecionado: boolean): ReservaEstado {
  return { ...estado, itens: estado.itens.map((i) => (i.id === id ? { ...i, selecionado } : i)) };
}

/** Marca ou desmarca todos os itens de uma vez. */
export function selecionarTodos(estado: ReservaEstado, selecionado: boolean): ReservaEstado {
  return { ...estado, itens: estado.itens.map((i) => ({ ...i, selecionado })) };
}

/** qtd <= 0 remove o item. */
export function definirQtd(estado: ReservaEstado, id: string, qtd: number): ReservaEstado {
  if (qtd <= 0) return { ...estado, itens: estado.itens.filter((i) => i.id !== id) };
  return {
    ...estado,
    itens: estado.itens.map((i) => (i.id === id ? { ...i, qtd: Math.min(MAX_POR_ITEM, Math.floor(qtd)) } : i)),
  };
}

export function limpar(estado: ReservaEstado): ReservaEstado {
  return { ...estado, itens: [] };
}

export function totalItens(estado: ReservaEstado): number {
  return estado.itens.filter(itemAtivo).reduce((soma, i) => soma + i.qtd, 0);
}

export function subtotalCentavos(itens: ReservaItem[]): number {
  return itens.filter(itemAtivo).reduce((soma, i) => soma + i.precoCentavos * i.qtd, 0);
}

/** Soma do que o cliente deixa de pagar nos itens com preço "De" confirmado. */
export function descontoCentavos(itens: ReservaItem[]): number {
  return itens.filter(itemAtivo).reduce((soma, i) => soma + (i.deCentavos && i.deCentavos > i.precoCentavos ? (i.deCentavos - i.precoCentavos) * i.qtd : 0), 0);
}

/** Subtotal "de tabela": usa o preço "De" quando existe, como na cesta (subtotal, descontos, total). */
export function subtotalDeTabelaCentavos(itens: ReservaItem[]): number {
  return subtotalCentavos(itens) + descontoCentavos(itens);
}

export function qtdDoItem(estado: ReservaEstado, id: string): number {
  return estado.itens.find((i) => i.id === id)?.qtd ?? 0;
}

/** Itens agrupados por loja: cada loja recebe a sua própria mensagem. */
export function porLoja(estado: ReservaEstado): Array<{ unitId: string; itens: ReservaItem[] }> {
  const mapa = new Map<string, ReservaItem[]>();
  for (const item of estado.itens.filter(itemAtivo)) mapa.set(item.unitId, [...(mapa.get(item.unitId) ?? []), item]);
  return [...mapa.entries()].map(([unitId, itens]) => ({ unitId, itens }));
}

export type DadosPedido = {
  modo: ModoReserva;
  /** Nome de quem retira ou recebe. */
  nome: string;
  /** Só na entrega. */
  bairro?: string;
  rua?: string;
  /** Forma de pagamento escolhida pelo cliente. */
  pagamento?: string;
  /** Taxa de entrega em centavos (0 se retirada ou não informada). */
  taxaEntregaCentavos?: number;
};

/**
 * Mensagem pronta do WhatsApp (passo 3 do protótipo): itens, loja, forma, nome, pagamento e subtotal.
 * Pede confirmação de preço e estoque (não promete nada). Nome e endereço vão só no texto da mensagem, nunca ao analytics.
 */
export function mensagemReserva(unitNome: string, itens: ReservaItem[], dados: DadosPedido): string {
  const linhas = itens.filter(itemAtivo).map((i) => `\u2022 ${i.qtd}x ${i.nome.replace(/\s+/g, " ").trim()}${i.receita === "controlado" ? " (controlado: receita retida na loja)" : i.receita ? " (exige receita)" : ""}`);
  const retirar = dados.modo === "retirar";
  const nome = dados.nome.replace(/\s+/g, " ").trim();
  const sub = subtotalCentavos(itens);
  const taxa = !retirar ? (dados.taxaEntregaCentavos ?? 0) : 0;
  const total = sub + taxa;
  const quando = retirar ? "no balcão" : "na entrega";
  const escolhido = dados.pagamento?.trim();
  const quandoForma = escolhido === "Pix" ? "pelo WhatsApp" : quando;
  const pag = escolhido ? `${escolhido} (${quandoForma})` : quando;
  return [
    `Olá, União Farma ${unitNome}! Quero pedir:`,
    ...linhas,
    "",
    `Loja: ${unitNome}`,
    `Forma: ${retirar ? "Retirar na loja" : "Entrega"}`,
    ...(!retirar && dados.bairro ? [`Bairro: ${dados.bairro}`] : []),
    ...(!retirar && dados.rua?.trim() ? [`Endereço: ${dados.rua.replace(/\s+/g, " ").trim()}`] : []),
    `Nome: ${nome || "[nome do cliente]"}`,
    `Pagamento: ${pag}`,
    taxa > 0 ? `Taxa de entrega: ${formatarCentavos(taxa)}` : null,
    `Total estimado: ${formatarCentavos(total)}`,
    "",
    ...(exigeReceita(itens) ? ["Tem medicamento com receita: retiro na loja e apresento a receita.", ""] : []),
    "Podem confirmar preço e estoque? Obrigado!",
  ].filter(Boolean).join("\n");
}

/** Lê e valida o que veio do navegador; qualquer coisa estranha vira reserva vazia. */
export function lerEstado(bruto: string | null): ReservaEstado {
  if (!bruto) return ESTADO_VAZIO;
  try {
    const dado = JSON.parse(bruto) as Partial<ReservaEstado>;
    const itens = Array.isArray(dado.itens)
      ? dado.itens.filter(
          (i): i is ReservaItem =>
            !!i &&
            typeof i.id === "string" &&
            typeof i.unitId === "string" &&
            typeof i.nome === "string" &&
            Number.isInteger(i.precoCentavos) &&
            i.precoCentavos > 0 &&
            Number.isInteger(i.qtd) &&
            i.qtd > 0 &&
            i.qtd <= MAX_POR_ITEM,
        )
      : [];
    return { itens, modo: dado.modo === "casa" ? "casa" : "retirar" };
  } catch {
    return ESTADO_VAZIO;
  }
}

/* ---- Armazenamento no navegador (assinatura para useSyncExternalStore) ---- */
let atual: ReservaEstado = ESTADO_VAZIO;
let carregado = false;
const ouvintes = new Set<() => void>();

function carregar(): void {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  try {
    atual = lerEstado(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    atual = ESTADO_VAZIO;
  }
}

export function lerReserva(): ReservaEstado {
  carregar();
  return atual;
}

export function lerReservaServidor(): ReservaEstado {
  return ESTADO_VAZIO;
}

export function assinarReserva(fn: () => void): () => void {
  carregar();
  ouvintes.add(fn);
  const aoMudarEmOutraAba = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    atual = lerEstado(event.newValue);
    ouvintes.forEach((o) => o());
  };
  window.addEventListener("storage", aoMudarEmOutraAba);
  return () => {
    ouvintes.delete(fn);
    window.removeEventListener("storage", aoMudarEmOutraAba);
  };
}

export function atualizarReserva(fn: (estado: ReservaEstado) => ReservaEstado): void {
  carregar();
  atual = fn(atual);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
  } catch {
    /* navegação privada ou sem espaço: a reserva continua valendo nesta aba */
  }
  ouvintes.forEach((o) => o());
}

/** Menor taxa de entrega (bairro da loja). A taxa de cada bairro vem de site-config (deliveryFees). */
export const TAXA_ENTREGA_CENTAVOS = 100;
export function taxaDoBairro(bairro: string | undefined): number | null {
  if (!bairro) return null;
  for (const unit of UNITS) {
    const taxa = unit.deliveryFees?.[bairro];
    if (taxa !== undefined) return taxa;
  }
  return null;
}
