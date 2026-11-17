import { segredo } from "./estoque-fonte";

/**
 * Cliente da API v3 da Lalamove (cotação, pedido, status, entregador e cancelamento).
 * Roda no Worker: assinatura HMAC-SHA256 com Web Crypto, sem dependências.
 * Chave e segredo vêm só de LALAMOVE_API_KEY e LALAMOVE_API_SECRET (segredos do Worker). Nunca vão para o navegador.
 */

export const LALAMOVE_SANDBOX_URL = "https://rest.sandbox.lalamove.com";
export const LALAMOVE_MARKET = "BR";
export const LALAMOVE_SERVICO = "LALAGO";
export const LALAMOVE_IDIOMA = "pt_BR";

/**
 * Ponto de coleta fixo: loja Nações Unidas.
 * Coordenadas iguais às de app/site-config.ts (unidade "nacoes"), conferidas no OpenStreetMap/Nominatim:
 * ficam dentro do trecho da Rua Inglaterra no bairro Nações Unidas (caixa -19.8807..-19.8787, -43.8670..-43.8662).
 */
export const COLETA_LOJA = {
  nome: "União Farma Nações Unidas",
  endereco: "Rua Inglaterra, 162, Nações Unidas, Sabará - MG, 34590-010",
  lat: -19.879422,
  lng: -43.866889,
  /** WhatsApp público da loja Nações Unidas (site-config.ts), mostrado ao entregador. */
  telefone: "+5531987629909",
} as const;

export function lalamoveBaseUrl() {
  return (segredo("LALAMOVE_BASE_URL") || LALAMOVE_SANDBOX_URL).replace(/\/+$/, "");
}

export function lalamoveModoTeste() {
  return /sandbox/i.test(lalamoveBaseUrl());
}

export function lalamoveConfigurado() {
  return Boolean(segredo("LALAMOVE_API_KEY") && segredo("LALAMOVE_API_SECRET"));
}

export class ErroLalamove extends Error {
  constructor(public status: number, public codigo: string) {
    super(codigo);
  }
}

async function hmacHex(segredoApi: string, texto: string) {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredoApi), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(texto));
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Monta o cabeçalho Authorization: `hmac {key}:{ts}:{assinatura}` com assinatura de `${ts}\r\n${METODO}\r\n${caminho}\r\n\r\n${corpo}`. */
export async function assinarLalamove(chave: string, segredoApi: string, metodo: string, caminho: string, corpo: string, ts = Date.now()) {
  const assinatura = await hmacHex(segredoApi, `${ts}\r\n${metodo.toUpperCase()}\r\n${caminho}\r\n\r\n${corpo}`);
  return `hmac ${chave}:${ts}:${assinatura}`;
}

async function chamar<T>(metodo: "GET" | "POST" | "DELETE", caminho: string, dados?: unknown): Promise<T | null> {
  const chave = segredo("LALAMOVE_API_KEY");
  const segredoApi = segredo("LALAMOVE_API_SECRET");
  if (!chave || !segredoApi) throw new ErroLalamove(503, "nao_configurado");
  const corpo = dados === undefined ? "" : JSON.stringify({ data: dados });
  const resposta = await fetch(`${lalamoveBaseUrl()}${caminho}`, {
    method: metodo,
    headers: {
      authorization: await assinarLalamove(chave, segredoApi, metodo, caminho, corpo),
      market: LALAMOVE_MARKET,
      "request-id": crypto.randomUUID(),
      accept: "application/json",
      ...(corpo ? { "content-type": "application/json" } : {}),
    },
    body: corpo || undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (resposta.status === 204) return null;
  const texto = await resposta.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  if (!resposta.ok) {
    const j = json as { message?: unknown; errors?: Array<{ id?: unknown; message?: unknown }> } | null;
    const codigo = typeof j?.message === "string" ? j.message : typeof j?.errors?.[0]?.id === "string" ? String(j.errors[0].id) : `http_${resposta.status}`;
    throw new ErroLalamove(resposta.status, codigo.slice(0, 120));
  }
  return ((json as { data?: T } | null)?.data ?? null) as T | null;
}

export type PrecoLalamove = { total?: string; currency?: string; [campo: string]: unknown };
export type CotacaoLalamove = {
  quotationId: string;
  expiresAt?: string;
  scheduleAt?: string;
  stops: Array<{ stopId: string; address?: string }>;
  priceBreakdown?: PrecoLalamove;
  distance?: { value?: string; unit?: string };
};
export type PedidoLalamove = {
  orderId: string;
  quotationId?: string;
  status?: string;
  driverId?: string;
  shareLink?: string;
  priceBreakdown?: PrecoLalamove;
  distance?: { value?: string; unit?: string };
};
export type EntregadorLalamove = { driverId?: string; name?: string; phone?: string; plateNumber?: string };

export async function cotarEntrega(destino: { lat: number; lng: number; endereco: string }) {
  const cotacao = await chamar<CotacaoLalamove>("POST", "/v3/quotations", {
    serviceType: LALAMOVE_SERVICO,
    language: LALAMOVE_IDIOMA,
    stops: [
      { coordinates: { lat: String(COLETA_LOJA.lat), lng: String(COLETA_LOJA.lng) }, address: COLETA_LOJA.endereco },
      { coordinates: { lat: String(destino.lat), lng: String(destino.lng) }, address: destino.endereco },
    ],
  });
  if (!cotacao?.quotationId || !Array.isArray(cotacao.stops) || cotacao.stops.length < 2) throw new ErroLalamove(502, "cotacao_invalida");
  return cotacao;
}

export async function chamarEntregador(p: {
  quotationId: string;
  stopColeta: string;
  stopEntrega: string;
  nome: string;
  telefone: string;
  observacao?: string;
  metadata?: Record<string, string>;
}) {
  const pedido = await chamar<PedidoLalamove>("POST", "/v3/orders", {
    quotationId: p.quotationId,
    sender: { stopId: p.stopColeta, name: COLETA_LOJA.nome, phone: COLETA_LOJA.telefone },
    recipients: [{ stopId: p.stopEntrega, name: p.nome, phone: p.telefone, ...(p.observacao ? { remarks: p.observacao } : {}) }],
    ...(p.metadata ? { metadata: p.metadata } : {}),
  });
  if (!pedido?.orderId) throw new ErroLalamove(502, "pedido_invalido");
  return pedido;
}

export async function consultarPedido(orderId: string) {
  return chamar<PedidoLalamove>("GET", `/v3/orders/${encodeURIComponent(orderId)}`);
}

export async function consultarEntregador(orderId: string, driverId: string) {
  return chamar<EntregadorLalamove>("GET", `/v3/orders/${encodeURIComponent(orderId)}/drivers/${encodeURIComponent(driverId)}`);
}

export async function cancelarPedido(orderId: string) {
  await chamar<null>("DELETE", `/v3/orders/${encodeURIComponent(orderId)}`);
}

/** Converte telefone brasileiro para E.164 (+55...). Devolve "" se não parecer um número válido. */
export function telefoneE164(entrada: string) {
  let digitos = entrada.replace(/\D/g, "");
  if (entrada.trim().startsWith("+")) return /^\+[1-9]\d{9,14}$/.test(`+${digitos}`) ? `+${digitos}` : "";
  digitos = digitos.replace(/^0+/, "");
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  if (!/^55\d{10,11}$/.test(digitos)) return "";
  return `+${digitos}`;
}

/** Mensagens em português para os erros da Lalamove mais comuns. */
export function mensagemErroLalamove(codigo: string) {
  const mapa: Record<string, string> = {
    nao_configurado: "Integração Lalamove não configurada.",
    ERR_INSUFFICIENT_CREDIT: "Sem crédito na carteira da Lalamove. Coloque saldo no portal da Lalamove para chamar entregador.",
    ERR_CANCELLATION_FORBIDDEN: "A Lalamove não deixa cancelar agora. Só dá para cancelar antes de um entregador aceitar ou até 5 minutos depois.",
    ERR_RATE_LIMIT_EXCEEDED: "Muitas chamadas seguidas para a Lalamove. Espere um minuto e tente de novo.",
    ERR_QUOTATION_EXPIRED: "A cotação venceu. Cote a entrega de novo.",
    ERR_OUT_OF_SERVICE_AREA: "Esse endereço fica fora da área atendida pela Lalamove.",
    ERR_INVALID_PHONE_NUMBER: "Telefone inválido para a Lalamove. Use DDD + número.",
    ERR_ORDER_NOT_FOUND: "A Lalamove não encontrou esse pedido.",
    ERR_INVALID_QUOTATION_ID: "A cotação venceu ou é inválida. Cote a entrega de novo.",
    ERR_UNAUTHORIZED: "A Lalamove recusou a chave de acesso.",
  };
  return mapa[codigo] || `A Lalamove recusou o pedido (${codigo}).`;
}
