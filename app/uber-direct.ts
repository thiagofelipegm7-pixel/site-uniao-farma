/**
 * Cliente da API do Uber Direct (cotação, entrega, status e cancelamento).
 * Roda no Worker com fetch puro, sem dependências. Não importa o ambiente do Worker:
 * quem chama passa as credenciais (UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET),
 * que nunca vão para o navegador nem para o banco.
 * Documentação: https://developer.uber.com/docs/deliveries (OAuth client_credentials, escopo eats.deliveries).
 */

export const UBER_AUTH_URL = "https://auth.uber.com/oauth/v2/token";
export const UBER_API_URL = "https://api.uber.com/v1";
export const UBER_ESCOPO = "eats.deliveries";

export type ConfigUber = { customerId: string; clientId: string; clientSecret: string };

export class ErroUber extends Error {
  status: number;
  codigo: string;
  constructor(status: number, codigo: string) {
    super(codigo);
    this.status = status;
    this.codigo = codigo;
  }
}

/** Monta a configuração a partir de uma função que lê segredos; devolve null se faltar alguma credencial. */
export function configUber(ler: (nome: string) => string): ConfigUber | null {
  const customerId = ler("UBER_DIRECT_CUSTOMER_ID");
  const clientId = ler("UBER_DIRECT_CLIENT_ID");
  const clientSecret = ler("UBER_DIRECT_CLIENT_SECRET");
  return customerId && clientId && clientSecret ? { customerId, clientId, clientSecret } : null;
}

/** Credenciais de teste e de produção usam o mesmo endereço; só UBER_DIRECT_AMBIENTE=producao tira o selo de teste. */
export function uberModoTeste(ler: (nome: string) => string) {
  return ler("UBER_DIRECT_AMBIENTE").toLowerCase() !== "producao";
}

// O token vale 30 dias e a Uber limita quantos tokens dá por hora: fica guardado na memória do Worker até 5 min antes de vencer.
let tokenGuardado: { clientId: string; token: string; venceEm: number } | null = null;

export function esquecerTokenUber() {
  tokenGuardado = null;
}

async function obterToken(cfg: ConfigUber, f: typeof fetch) {
  if (tokenGuardado && tokenGuardado.clientId === cfg.clientId && tokenGuardado.venceEm > Date.now()) return tokenGuardado.token;
  const resposta = await f(UBER_AUTH_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "client_credentials", scope: UBER_ESCOPO }).toString(),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await resposta.json().catch(() => null)) as { access_token?: unknown; expires_in?: unknown; error?: unknown } | null;
  if (!resposta.ok || typeof json?.access_token !== "string") {
    throw new ErroUber(resposta.status === 429 ? 429 : 401, typeof json?.error === "string" ? `auth_${json.error}`.slice(0, 80) : "auth_falhou");
  }
  const segundos = Number(json.expires_in);
  const validade = Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : 3_600_000;
  tokenGuardado = { clientId: cfg.clientId, token: json.access_token, venceEm: Date.now() + Math.max(validade - 300_000, 60_000) };
  return json.access_token;
}

async function chamar<T>(cfg: ConfigUber, metodo: "GET" | "POST", caminho: string, dados: unknown, f: typeof fetch, tentativa = 0): Promise<T> {
  const token = await obterToken(cfg, f);
  const resposta = await f(`${UBER_API_URL}/customers/${encodeURIComponent(cfg.customerId)}${caminho}`, {
    method: metodo,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(dados === undefined ? {} : { "content-type": "application/json" }),
    },
    body: dados === undefined ? undefined : JSON.stringify(dados),
    signal: AbortSignal.timeout(20_000),
  });
  if (resposta.status === 401 && tentativa === 0) {
    // Token revogado ou trocado: pede outro uma única vez.
    esquecerTokenUber();
    return chamar<T>(cfg, metodo, caminho, dados, f, 1);
  }
  const texto = await resposta.text();
  let json: unknown = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  if (!resposta.ok) {
    const codigo = typeof (json as { code?: unknown } | null)?.code === "string" ? String((json as { code: string }).code) : `http_${resposta.status}`;
    throw new ErroUber(resposta.status, codigo.slice(0, 120));
  }
  return json as T;
}

export const COLETA_UBER_ENDERECO = JSON.stringify({
  street_address: ["Rua Inglaterra, 162", "Nações Unidas"],
  city: "Sabará",
  state: "MG",
  zip_code: "34590-010",
  country: "BR",
});

export type CotacaoUber = {
  id: string;
  fee?: number;
  currency?: string;
  currency_type?: string;
  expires?: string;
  duration?: number;
  pickup_duration?: number;
  dropoff_eta?: string;
  dropoff_deadline?: string;
};
export type EntregadorUberApi = {
  name?: string;
  phone_number?: string;
  vehicle_type?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_license_plate?: string;
  public_phone_info?: { formatted_phone_number?: string; phone_number?: string };
};
export type EntregaUber = {
  id: string;
  quote_id?: string;
  status?: string;
  fee?: number;
  currency?: string;
  tracking_url?: string;
  live_mode?: boolean;
  dropoff_eta?: string;
  courier?: EntregadorUberApi | null;
};

export type Coleta = { nome: string; lat: number; lng: number; telefone: string };
export type Destino = { lat: number; lng: number; endereco: string };

export function criarClienteUber(cfg: ConfigUber, f: typeof fetch = fetch) {
  return {
    async cotar(coleta: Coleta, destino: Destino) {
      const cotacao = await chamar<CotacaoUber>(cfg, "POST", "/delivery_quotes", {
        pickup_address: COLETA_UBER_ENDERECO,
        pickup_latitude: coleta.lat,
        pickup_longitude: coleta.lng,
        pickup_phone_number: coleta.telefone,
        dropoff_address: destino.endereco,
        dropoff_latitude: destino.lat,
        dropoff_longitude: destino.lng,
      }, f);
      if (!cotacao?.id) throw new ErroUber(502, "cotacao_invalida");
      return cotacao;
    },
    async criar(p: {
      quoteId: string;
      coleta: Coleta;
      destino: Destino;
      nome: string;
      telefone: string;
      observacao?: string;
      idExterno: string;
      /** Só com credenciais de teste: o Robo Courier da Uber simula o entregador do aceite até a entrega. */
      simularEntregador?: boolean;
    }) {
      const entrega = await chamar<EntregaUber>(cfg, "POST", "/deliveries", {
        quote_id: p.quoteId,
        pickup_name: p.coleta.nome,
        pickup_business_name: p.coleta.nome,
        pickup_address: COLETA_UBER_ENDERECO,
        pickup_phone_number: p.coleta.telefone,
        pickup_latitude: p.coleta.lat,
        pickup_longitude: p.coleta.lng,
        dropoff_name: p.nome,
        dropoff_address: p.destino.endereco,
        dropoff_phone_number: p.telefone,
        dropoff_latitude: p.destino.lat,
        dropoff_longitude: p.destino.lng,
        ...(p.observacao ? { dropoff_notes: p.observacao.slice(0, 280) } : {}),
        manifest_items: [{ name: "Pedido da farmácia", quantity: 1, size: "small" }],
        external_id: p.idExterno,
        idempotency_key: p.idExterno,
        ...(p.simularEntregador ? { test_specifications: { robo_courier_specification: { mode: "auto" } } } : {}),
      }, f);
      if (!entrega?.id) throw new ErroUber(502, "pedido_invalido");
      return entrega;
    },
    consultar(id: string) {
      return chamar<EntregaUber>(cfg, "GET", `/deliveries/${encodeURIComponent(id)}`, undefined, f);
    },
    cancelar(id: string) {
      return chamar<EntregaUber>(cfg, "POST", `/deliveries/${encodeURIComponent(id)}/cancel`, {}, f);
    },
  };
}

/** A Uber manda valores em centavos (ex.: 1050 = R$ 10,50); guardamos como texto decimal igual à Lalamove. */
export function precoUber(fee: unknown, moeda: unknown) {
  const centavos = Number(fee);
  return {
    total: Number.isFinite(centavos) ? (centavos / 100).toFixed(2) : null,
    moeda: typeof moeda === "string" && moeda ? moeda.toUpperCase() : null,
  };
}

/** Dados do entregador como a Uber devolve. A Uber nem sempre informa a placa; quando falta, fica vazia. */
export function entregadorUber(c: EntregadorUberApi | null | undefined) {
  if (!c?.name) return null;
  const veiculo = [c.vehicle_make, c.vehicle_model].filter(Boolean).join(" ") + (c.vehicle_color ? ` (${c.vehicle_color})` : "");
  return {
    nome: c.name,
    telefone: c.phone_number || c.public_phone_info?.formatted_phone_number || c.public_phone_info?.phone_number || null,
    placa: c.vehicle_license_plate || null,
    veiculo: veiculo.trim() || null,
  };
}

/** Mensagens em português para os erros mais comuns do Uber Direct. */
export function mensagemErroUber(codigo: string) {
  const mapa: Record<string, string> = {
    nao_configurado: "Integração Uber Direct não configurada.",
    auth_falhou: "A Uber recusou a chave de acesso.",
    auth_invalid_client: "A Uber recusou a chave de acesso.",
    unauthorized: "A Uber recusou a chave de acesso.",
    address_undeliverable: "Esse endereço fica fora da área atendida pelo Uber Direct.",
    address_undeliverable_limited_couriers: "O Uber Direct está sem entregadores para esse endereço agora. Tente de novo em alguns minutos.",
    unknown_location: "A Uber não reconheceu esse endereço. Confira rua, número e bairro.",
    couriers_busy: "Todos os entregadores do Uber Direct estão ocupados agora. Tente de novo em alguns minutos.",
    expired_quote: "A cotação venceu. Cote a entrega de novo.",
    used_quote: "Essa cotação já foi usada. Cote a entrega de novo.",
    missing_payment: "Falta cadastrar o pagamento no painel do Uber Direct (Billing).",
    noncancelable_delivery: "A Uber não deixa cancelar essa entrega agora.",
    delivery_not_found: "A Uber não encontrou essa entrega.",
    invalid_params: "A Uber recusou os dados da entrega. Confira o endereço e o telefone.",
    rate_limit_exceeded: "Muitas chamadas seguidas para a Uber. Espere um minuto e tente de novo.",
    customer_suspended: "A conta do Uber Direct está suspensa.",
    customer_blocked: "A conta do Uber Direct está bloqueada.",
    customer_not_found: "A Uber não encontrou a conta (Customer ID) do Uber Direct.",
  };
  return mapa[codigo] || `A Uber recusou o pedido (${codigo}).`;
}
