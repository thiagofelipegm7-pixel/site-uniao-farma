/**
 * Cache de borda (Cache API da Cloudflare) para as páginas pesadas de catálogo, pensado para robôs de IA e buscadores.
 *
 * Por quê: o Worker não guarda HTML no cache da Cloudflare (o `s-maxage` do middleware só vale para quem está na frente).
 * Cada rajada de rastreamento (GPTBot, OAI-SearchBot, Googlebot) montava a página inteira em isolates frios, estourava o
 * limite de CPU (erro 1102, que aparece como 503) e o robô via falha. Aqui a primeira visita monta a página e as seguintes,
 * por alguns minutos, saem prontas. Nenhum robô é bloqueado: todos recebem a mesma resposta, só que mais leve.
 *
 * Só entra no cache: GET anônimo (sem cookie nem autorização), em rotas públicas de catálogo, com resposta 200 em HTML
 * marcada como pública pelo middleware. Todo o resto passa direto.
 */

export type DecisaoCache = { chave: string; ttl: number };

/** Mesma política do middleware para HTML público: é o que o cliente enxerga num acerto do cache. */
export const CACHE_CONTROL_HTML_PUBLICO = "public, s-maxage=60, stale-while-revalidate=300";

/** Hub da loja: a amostra de produtos varia por dia, não por minuto. */
const TTL_HUB_SEGUNDOS = 300;
/** Produto e departamento mostram preço e estoque: ficam menos tempo guardados. */
const TTL_CATALOGO_SEGUNDOS = 120;

const ROTA_HUB = /^\/nacoes-unidas\/produtos\/?$/;
const ROTA_PRODUTO = /^\/nacoes-unidas\/produtos\/[a-z0-9][a-z0-9-]*\/?$/;
const ROTA_DEPARTAMENTO = /^\/departamentos\/[a-z0-9][a-z0-9-]*\/?$/;

/** Cabeçalhos que indicam navegação do cliente (RSC) ou requisição com identidade: nunca vão para o cache. */
const CABECALHOS_QUE_BARRAM = ["cookie", "authorization", "rsc", "next-router-state-tree", "next-router-prefetch", "x-nextjs-data"];

type PedidoMinimo = { method: string; url: string; headers: { get(nome: string): string | null } };
type RespostaMinima = { status: number; headers: { get(nome: string): string | null } };

export function decidirCacheBorda(pedido: PedidoMinimo): DecisaoCache | null {
  if (pedido.method !== "GET") return null;
  for (const nome of CABECALHOS_QUE_BARRAM) if (pedido.headers.get(nome)) return null;
  let url: URL;
  try {
    url = new URL(pedido.url);
  } catch {
    return null;
  }
  const caminho = url.pathname;
  const hub = ROTA_HUB.test(caminho);
  if (!hub && !ROTA_PRODUTO.test(caminho) && !ROTA_DEPARTAMENTO.test(caminho)) return null;
  // O hub não lê a query (é igual para qualquer ?x=), então a chave ignora; as outras rotas mantêm a query, ordenada.
  const params = [...url.searchParams.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (params.length > 8) return null;
  const busca = hub || params.length === 0 ? "" : `?${new URLSearchParams(params).toString()}`;
  const normal = caminho.length > 1 ? caminho.replace(/\/$/, "") : caminho;
  return { chave: `${url.origin}${normal}${busca}`, ttl: hub ? TTL_HUB_SEGUNDOS : TTL_CATALOGO_SEGUNDOS };
}

/** A resposta pode ser guardada? Só 200 em HTML, público, sem cookie novo. */
export function respostaPodeSerGuardada(resposta: RespostaMinima): boolean {
  if (resposta.status !== 200) return false;
  if (!(resposta.headers.get("content-type") ?? "").toLowerCase().includes("text/html")) return false;
  if (resposta.headers.get("set-cookie")) return false;
  const controle = (resposta.headers.get("cache-control") ?? "").toLowerCase();
  if (!controle.includes("public") || controle.includes("no-store") || controle.includes("private")) return false;
  return (resposta.headers.get("vary") ?? "").trim() !== "*";
}
