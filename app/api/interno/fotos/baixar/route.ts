import { mimeDosBytes, urlPermitida } from "../../../../fotos-enviadas";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const MAX_BYTES = 6_000_000;
const MAX_SALTOS = 3;

/** Baixa uma imagem da internet para o painel (a página não consegue: a política de segurança só deixa falar com o próprio site). Só equipe logada. */
export async function POST(request: Request) {
  let url: URL | null = null;
  try {
    const corpo = (await request.json()) as { url?: unknown };
    url = typeof corpo.url === "string" ? urlPermitida(corpo.url) : null;
  } catch {
    // corpo inválido
  }
  if (!url) return Response.json({ ok: false, erro: "endereco_invalido" }, { status: 400, headers: SEM_CACHE });

  let resposta: Response | null = null;
  for (let salto = 0; salto <= MAX_SALTOS && url; salto += 1) {
    try {
      resposta = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { accept: "image/webp,image/png,image/jpeg,*/*;q=0.5", "user-agent": "Mozilla/5.0 (compatible; UniaoFarmaFotos/1.0)" } });
    } catch {
      return Response.json({ ok: false, erro: "nao_baixou" }, { status: 502, headers: SEM_CACHE });
    }
    if (resposta.status >= 300 && resposta.status < 400) {
      const local = resposta.headers.get("location");
      url = local ? urlPermitida(new URL(local, url).toString()) : null; // cada salto passa pela mesma conferência
      resposta = null;
      continue;
    }
    break;
  }
  if (!resposta || !resposta.ok) return Response.json({ ok: false, erro: "nao_baixou" }, { status: 502, headers: SEM_CACHE });
  const tamanho = Number(resposta.headers.get("content-length") ?? 0);
  if (tamanho > MAX_BYTES) return Response.json({ ok: false, erro: "grande_demais" }, { status: 413, headers: SEM_CACHE });
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.length > MAX_BYTES) return Response.json({ ok: false, erro: "grande_demais" }, { status: 413, headers: SEM_CACHE });
  const mime = mimeDosBytes(bytes);
  if (!mime) return Response.json({ ok: false, erro: "formato_invalido" }, { status: 415, headers: SEM_CACHE });
  return new Response(bytes, { headers: { ...SEM_CACHE, "content-type": mime } });
}
