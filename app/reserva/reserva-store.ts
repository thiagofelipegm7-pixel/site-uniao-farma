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
  /** Unidades que restam na loja (1 a 5): a quantidade da cesta não passa disso. Ausente = sem limite além de MAX_POR_ITEM. */
  max?: number;
  /** Página do produto no catálogo (para conferir a disponibilidade ao vivo). Ausente em itens sem página. */
  slug?: string;
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
  if (existente) {
    // O limite vem do último "Resta N" que o cliente viu; sem limite agora, o antigo cai.
    const comLimite: ReservaEstado = { ...estado, itens: estado.itens.map((i) => (i.id === id ? limiteDoItem({ ...i, max: item.max, slug: item.slug ?? i.slug }) : i)) };
    return definirSelecao(definirQtd(comLimite, id, existente.qtd + qtd), id, true);
  }
  if (!(item.precoCentavos > 0)) return estado;
  const novo: ReservaItem = limiteDoItem({ ...item, id, qtd: 1 });
  novo.qtd = Math.min(tetoDoItem(novo), Math.max(1, qtd));
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

/** Maior quantidade permitida do item: o que resta na loja (se informado) ou o teto geral. */
export function tetoDoItem(item: Pick<ReservaItem, "max">): number {
  return typeof item.max === "number" && item.max >= 1 ? Math.min(MAX_POR_ITEM, Math.floor(item.max)) : MAX_POR_ITEM;
}

/** Descarta um `max` inválido (zero, negativo, fracionado ou fora de 1..MAX_POR_ITEM). */
function limiteDoItem<T extends Pick<ReservaItem, "max">>(item: T): T {
  if (item.max === undefined) return item;
  const { max, ...resto } = item;
  return (typeof max === "number" && Number.isInteger(max) && max >= 1 && max <= MAX_POR_ITEM ? { ...resto, max } : resto) as T;
}

/** Limite de unidades do item na cesta (undefined = sem limite próprio). */
export function maxDoItem(estado: ReservaEstado, id: string): number | undefined {
  return estado.itens.find((i) => i.id === id)?.max;
}

/** Com o estoque de agora: item com "restam N" passa a limitar a N unidades; item que voltou a ter 6 ou mais perde o limite. Quem acabou fica (o aviso aparece na cesta). */
export function ajustarLimitesAoVivo(estado: ReservaEstado, mudou: Record<string, number> | null): ReservaEstado {
  if (!mudou) return estado;
  let alterou = false;
  const itens = estado.itens.map((i) => {
    const nivel = i.slug ? mudou[i.slug] : undefined;
    if (nivel === undefined || nivel === 0) return i;
    const max = nivel >= 1 && nivel <= 5 ? nivel : undefined;
    if (i.max === max && (max === undefined || i.qtd <= max)) return i;
    alterou = true;
    const { max: _antes, ...resto } = i;
    void _antes;
    return { ...resto, ...(max !== undefined ? { max } : {}), qtd: max !== undefined ? Math.min(i.qtd, max) : i.qtd };
  });
  return alterou ? { ...estado, itens } : estado;
}

/** qtd <= 0 remove o item. A quantidade nunca passa do que resta na loja (`max`). */
export function definirQtd(estado: ReservaEstado, id: string, qtd: number): ReservaEstado {
  if (qtd <= 0) return { ...estado, itens: estado.itens.filter((i) => i.id !== id) };
  return {
    ...estado,
    itens: estado.itens.map((i) => (i.id === id ? { ...i, qtd: Math.min(tetoDoItem(i), Math.floor(qtd)) } : i)),
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
  /** Número curto do pedido (ex.: K7P3), para achar a conversa. Sem dado pessoal. */
  codigo?: string;
  /** Só entrega em dinheiro: 0 = não precisa de troco; valor em centavos = troco para esse valor; indefinido = não perguntado. */
  trocoCentavos?: number;
  /** Como a receita chega à loja: "foto" = o cliente manda a foto na conversa; "loja" (padrão) = leva a receita ao retirar. */
  receita?: "foto" | "loja";
};

const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O, 1/I/L: não se confunde ao ler

/** Código curto do pedido (4 caracteres, ex.: K7P3). Só serve para achar a conversa; não leva dado do cliente. */
export function gerarCodigoPedido(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
}

/** Valor digitado no "troco para": só vale se for maior que o total a pagar. Devolve centavos ou null. */
export function trocoValido(texto: string, totalCentavos: number): number | null {
  const centavos = precoParaCentavos(texto);
  return centavos !== null && centavos > totalCentavos ? centavos : null;
}

/**
 * Mensagem pronta do WhatsApp (passo 3 do protótipo): itens, loja, forma, nome, pagamento e subtotal.
 * Pede confirmação de preço e estoque (não promete nada). Nome e endereço vão só no texto da mensagem, nunca ao analytics.
 */
export function mensagemReserva(unitNome: string, itens: ReservaItem[], dados: DadosPedido): string {
  const linhas = itens.filter(itemAtivo).map((i) => `\u2022 ${i.qtd}x ${i.nome.replace(/\s+/g, " ").trim()}${i.receita === "controlado" ? " (controlado: receita retida na loja)" : i.receita ? " (exige receita)" : ""} \u2014 ${formatarCentavos(i.precoCentavos * i.qtd)}`);
  const retirar = dados.modo === "retirar";
  const nome = dados.nome.replace(/\s+/g, " ").trim();
  const sub = subtotalCentavos(itens);
  const taxa = !retirar ? (dados.taxaEntregaCentavos ?? 0) : 0;
  const total = sub + taxa;
  const quando = retirar ? "no balcão" : "na entrega";
  const escolhido = dados.pagamento?.trim();
  const quandoForma = escolhido === "Pix" ? "pelo WhatsApp" : quando;
  const troco = !retirar && escolhido === "Dinheiro" && dados.trocoCentavos !== undefined ? (dados.trocoCentavos > 0 ? ` \u2014 troco para ${formatarCentavos(dados.trocoCentavos)}` : " \u2014 sem troco") : "";
  const pag = escolhido ? `${escolhido} (${quandoForma})${troco}` : "a escolher";
  // Linhas em branco separam os blocos (itens, entrega, pagamento); só null/false são descartados.
  return [
    `Olá, União Farma ${unitNome}! Quero pedir:`,
    ...(dados.codigo ? [`Pedido: #${dados.codigo}`] : []),
    "",
    "*Itens*",
    ...linhas,
    "",
    `*${retirar ? "Retirada" : "Entrega"}*`,
    `Forma: ${retirar ? "Retirar na loja" : "Entrega"}`,
    ...(!retirar && dados.bairro ? [`Bairro: ${dados.bairro}`] : []),
    ...(!retirar && dados.rua?.trim() ? [`Endereço: ${dados.rua.replace(/\s+/g, " ").trim()}`] : []),
    `Nome: ${nome || "[nome do cliente]"}`,
    "",
    "*Pagamento e total*",
    `Pagamento: ${pag}`,
    ...(taxa > 0 ? [`Produtos: ${formatarCentavos(sub)}`, `Taxa de entrega: ${formatarCentavos(taxa)}`] : []),
    `*Total estimado: ${formatarCentavos(total)}*`,
    "",
    ...(exigeReceita(itens) ? [dados.receita === "foto" ? "Tem medicamento com receita: vou enviar a foto da receita aqui na conversa e retiro na loja com a receita." : "Tem medicamento com receita: retiro na loja e apresento a receita.", ""] : []),
    "Se faltar algum item, podem sugerir outro parecido?",
    "Podem confirmar preço e estoque? Obrigado!",
  ].join("\n");
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
        ).map((i) => limiteDoItem(i)).map((i) => (i.qtd > tetoDoItem(i) ? { ...i, qtd: tetoDoItem(i) } : i))
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
