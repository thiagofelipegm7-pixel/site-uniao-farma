/**
 * Cliente da API da Motoboys BH (sistema da Mapp Sistemas): por enquanto só a cotação ("API Calcular Serviço").
 * Roda no Worker com fetch puro. Quem chama passa as credenciais (MOTOBOYSBH_TOKEN_CALCULAR e MOTOBOYSBH_COD_CLIENTE),
 * que nunca vão para o navegador nem para o banco.
 * Documentação pública: https://motoboysbh.com.br/integracaoWebService/doc
 * - Envia um JSON por POST para https://motoboysbh.com.br/integracao com token (chave "calcular"), codCliente e pontos.
 * - Calcular não cria serviço nem chama motoboy: é só a simulação do frete.
 * - Responde {"Sucesso": {valor, distancia (km), tempo (hh:mm:ss), modalidades}} ou {"Erro": "texto"}.
 * O token e o codCliente são pedidos ao administrador da Motoboys BH (há credenciais de teste e de produção).
 */

export const MOTOBOYSBH_URL = "https://motoboysbh.com.br/integracao";
/** Painel onde a equipe pede o motoboy enquanto a chamada pela API não estiver ligada. */
export const MOTOBOYSBH_PAINEL_URL = "https://motoboysbh.com.br/";

export type ConfigMotoboysBh = { token: string; codCliente: string; url: string };

export class ErroMotoboysBh extends Error {
  status: number;
  codigo: string;
  constructor(status: number, codigo: string) {
    super(codigo);
    this.status = status;
    this.codigo = codigo;
  }
}

/** Monta a configuração a partir de uma função que lê segredos; devolve null se faltar alguma credencial. */
export function configMotoboysBh(ler: (nome: string) => string): ConfigMotoboysBh | null {
  const token = ler("MOTOBOYSBH_TOKEN_CALCULAR").trim();
  const codCliente = ler("MOTOBOYSBH_COD_CLIENTE").trim();
  if (!token || !codCliente) return null;
  // Endereço alternativo só se a Motoboys BH indicar outro (ex.: ambiente de teste); precisa ser https no mesmo domínio.
  const alternativo = ler("MOTOBOYSBH_URL").trim();
  const url = /^https:\/\/(www\.)?motoboysbh\.com\.br\/[\w-]+$/.test(alternativo) ? alternativo : MOTOBOYSBH_URL;
  return { token, codCliente, url };
}

/** Sem MOTOBOYSBH_AMBIENTE=producao o painel mostra o selo de teste (credenciais de usuário de teste). */
export function motoboysBhModoTeste(ler: (nome: string) => string) {
  return ler("MOTOBOYSBH_AMBIENTE").trim().toLowerCase() !== "producao";
}

export type PontoMotoboysBh = {
  rua: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  la?: string;
  lo?: string;
  cep?: string;
};

export const COLETA_MOTOBOYSBH: PontoMotoboysBh = {
  rua: "Rua Inglaterra",
  numero: "162",
  complemento: "",
  bairro: "Nações Unidas",
  cidade: "Sabará",
  uf: "MG",
  la: "-19.879422",
  lo: "-43.866889",
  cep: "34590-010",
};

export type ModalidadeMotoboysBh = { disponivel?: boolean; valor?: number | string | null; titulo?: string; descricao?: string };
export type CotacaoMotoboysBh = {
  /** Valor padrão em reais, com 2 casas (ex.: "17.40"). */
  total: string;
  distanciaM: number | null;
  /** Tempo de trajeto simulado em minutos (arredondado para cima); não inclui a espera por um motoboy. */
  trajetoMin: number | null;
  modalidades: Record<string, { disponivel: boolean; valor: string | null; titulo: string }>;
  obs: string | null;
};

const dinheiro = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : null;
};

/** "00:32:05" → 33 minutos. Formato estranho vira null. */
export function minutosDoTempo(tempo: unknown): number | null {
  if (typeof tempo !== "string") return null;
  const m = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(tempo.trim());
  if (!m) return null;
  const total = Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60;
  return total > 0 ? Math.ceil(total) : null;
}

/** Lê a resposta da cotação. Erro conhecido vira ErroMotoboysBh com código curto. */
export function lerCotacaoMotoboysBh(json: unknown): CotacaoMotoboysBh {
  const corpo = (json && typeof json === "object" ? json : {}) as { Sucesso?: Record<string, unknown>; Erro?: unknown };
  if (typeof corpo.Erro === "string" || !corpo.Sucesso) throw new ErroMotoboysBh(422, codigoDoErro(typeof corpo.Erro === "string" ? corpo.Erro : ""));
  const s = corpo.Sucesso;
  const total = dinheiro(s.valor);
  if (!total) throw new ErroMotoboysBh(502, "cotacao_invalida");
  const km = Number(String(s.distancia ?? "").replace(",", "."));
  const modalidades: CotacaoMotoboysBh["modalidades"] = {};
  if (s.modalidades && typeof s.modalidades === "object") {
    for (const [chave, bruto] of Object.entries(s.modalidades as Record<string, ModalidadeMotoboysBh>)) {
      if (!/^[a-z_]{1,20}$/.test(chave) || !bruto || typeof bruto !== "object") continue;
      modalidades[chave] = {
        disponivel: bruto.disponivel === true,
        valor: bruto.disponivel === true ? dinheiro(bruto.valor) : null,
        titulo: typeof bruto.titulo === "string" ? bruto.titulo.slice(0, 60) : "",
      };
    }
  }
  return {
    total,
    distanciaM: Number.isFinite(km) && km >= 0 ? Math.round(km * 1000) : null,
    trajetoMin: minutosDoTempo(s.tempo),
    modalidades,
    obs: typeof s.obs === "string" ? s.obs.slice(0, 200) : null,
  };
}

/** Os erros da API vêm em texto; transforma nos casos documentados. */
export function codigoDoErro(texto: string): string {
  const t = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (t.includes("token")) return "token_invalido";
  if (t.includes("codigo do cliente")) return "cliente_invalido";
  if (t.includes("solicitante")) return "solicitante_nao_definido";
  if (t.includes("erro no ponto")) return "endereco_invalido";
  if (t.includes("2 ou mais pontos")) return "pontos_insuficientes";
  if (t.includes("limite de enderecos")) return "pontos_demais";
  if (t.includes("retorno")) return "retorno_nao_configurado";
  return "recusado";
}

export function mensagemErroMotoboysBh(codigo: string) {
  const mapa: Record<string, string> = {
    nao_configurado: "Integração Motoboys BH não configurada.",
    token_invalido: "A Motoboys BH recusou a chave de acesso (token).",
    cliente_invalido: "A Motoboys BH não reconheceu o código do cliente.",
    solicitante_nao_definido: "A Motoboys BH não achou o solicitante desta conta. Fale com o suporte da Mapp Sistemas.",
    endereco_invalido: "A Motoboys BH não entendeu o endereço. Confira rua, número e bairro.",
    pontos_insuficientes: "A Motoboys BH precisa da coleta e da entrega para cotar.",
    pontos_demais: "Endereços demais para a Motoboys BH.",
    retorno_nao_configurado: "A cotação com retorno não está ligada na conta da Motoboys BH.",
    cotacao_invalida: "A Motoboys BH respondeu sem valor. Tente de novo.",
    rate_limit: "Muitas cotações seguidas na Motoboys BH. Espere um pouco e tente de novo.",
    recusado: "A Motoboys BH recusou a cotação.",
    chamada_manual: "A chamada da Motoboys BH ainda é feita no painel da Motoboys BH, com o valor desta cotação.",
  };
  return mapa[codigo] || "A Motoboys BH recusou a cotação.";
}

export function criarClienteMotoboysBh(cfg: ConfigMotoboysBh, f: typeof fetch = fetch) {
  return {
    /** Só simula o frete: não cria serviço, não chama motoboy e não cobra. */
    async cotar(destino: { lat: number; lng: number; endereco: string; complemento?: string; cep?: string }) {
      const pontos: PontoMotoboysBh[] = [
        COLETA_MOTOBOYSBH,
        {
          rua: destino.endereco.slice(0, 200),
          complemento: (destino.complemento ?? "").slice(0, 120),
          cidade: "Sabará",
          uf: "MG",
          la: destino.lat.toFixed(6),
          lo: destino.lng.toFixed(6),
          cep: destino.cep ?? "",
        },
      ];
      const resposta = await f(cfg.url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ token: cfg.token, codCliente: cfg.codCliente, pontos, retorno: "N", tipoCalculo: "" }),
        signal: AbortSignal.timeout(20_000),
      });
      if (resposta.status === 429) throw new ErroMotoboysBh(429, "rate_limit");
      const texto = await resposta.text();
      let json: unknown = null;
      try {
        json = texto ? JSON.parse(texto) : null;
      } catch {
        json = null;
      }
      if (!resposta.ok && !json) throw new ErroMotoboysBh(502, `http_${resposta.status}`);
      return lerCotacaoMotoboysBh(json);
    },
  };
}
