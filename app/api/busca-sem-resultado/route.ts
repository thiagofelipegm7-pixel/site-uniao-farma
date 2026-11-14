import { registrarBusca, resultadoValido, termoParaRegistro } from "../../busca-sem-resultado";
import { banco } from "../../estoque-fonte";

export const dynamic = "force-dynamic";

const porMinuto = new Map<string, { n: number; ate: number }>();
const diaBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/**
 * Recebe uma busca que não achou produto (texto normalizado e o que o site fez: nada, correção, parcial ou pergunta).
 * Anônimo: nada identifica quem digitou (o IP só conta o limite na memória, não é guardado). Nunca devolve erro: o registro não pode atrapalhar a busca.
 */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 512) return new Response(null, { status: 413 });
  // Só pedidos feitos pelo próprio site.
  const origem = request.headers.get("origin");
  if (origem) {
    try {
      if (new URL(origem).host !== new URL(request.url).host) return new Response(null, { status: 204 });
    } catch {
      return new Response(null, { status: 204 });
    }
  }
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const agora = Date.now();
  const atual = porMinuto.get(ip);
  if (atual && atual.ate > agora && atual.n >= 20) return new Response(null, { status: 204 });
  porMinuto.set(ip, atual && atual.ate > agora ? { n: atual.n + 1, ate: atual.ate } : { n: 1, ate: agora + 60_000 });
  if (porMinuto.size > 2000) porMinuto.clear();
  let corpo: { q?: unknown; r?: unknown } = {};
  try {
    corpo = (await request.json()) as typeof corpo;
  } catch {
    return new Response(null, { status: 400 });
  }
  const termo = termoParaRegistro(corpo.q);
  const resultado = resultadoValido(corpo.r);
  const db = banco();
  if (termo && resultado && db) await registrarBusca(db, termo, resultado, diaBrasilia()).catch(() => undefined);
  return new Response(null, { status: 204 });
}
