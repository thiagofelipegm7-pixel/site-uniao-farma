import { banco } from "../../estoque-fonte";
import { limparErro, registrarErro, type ErroBruto } from "../../erros";

export const dynamic = "force-dynamic";

const porMinuto = new Map<string, { n: number; ate: number }>();
const diaBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Recebe um erro de JavaScript do aparelho do cliente (sem cookie nem dado pessoal; ver app/erros.ts). Nunca devolve erro: o registro não pode atrapalhar a página. */
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 2048) return new Response(null, { status: 413 });
  // Limite simples por aparelho/minuto (o isolate guarda só o contador, nada identifica a pessoa depois).
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const agora = Date.now();
  const atual = porMinuto.get(ip);
  if (atual && atual.ate > agora && atual.n >= 8) return new Response(null, { status: 204 });
  porMinuto.set(ip, atual && atual.ate > agora ? { n: atual.n + 1, ate: atual.ate } : { n: 1, ate: agora + 60_000 });
  if (porMinuto.size > 2000) porMinuto.clear();
  let bruto: ErroBruto = {};
  try {
    bruto = (await request.json()) as ErroBruto;
  } catch {
    return new Response(null, { status: 400 });
  }
  const erro = limparErro({ ...bruto, ua: request.headers.get("user-agent") });
  const db = banco();
  if (erro && db) await registrarErro(db, erro, diaBrasilia()).catch(() => false);
  return new Response(null, { status: 204 });
}
