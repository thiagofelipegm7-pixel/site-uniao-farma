import { banco } from "../../estoque-fonte";
import { idDaLinhaValido, lerImagemDeDataUrl } from "../../banner-imagem";

export const dynamic = "force-dynamic";

type Consulta = { prepare: (sql: string) => { bind: (...v: unknown[]) => { all: <T>() => Promise<{ results: T[] }> } } };

/**
 * Arte de um banner como arquivo binário (antes ia como texto base64 dentro do JSON da lista, mais de 1 MB).
 * `?v=` é o id da linha no banco: cada arte nova tem um id novo, então o conteúdo de um endereço nunca muda e fica um ano em cache.
 * Só devolve imagem de formato comum (sem SVG) de uma linha de banner; qualquer outra coisa dá 404.
 */
export async function GET(request: Request) {
  const id = idDaLinhaValido(new URL(request.url).searchParams.get("v"));
  if (id === null) return new Response(null, { status: 404 });
  const db = banco() as Consulta | null;
  if (!db) return new Response(null, { status: 404 });
  try {
    const { results } = await db.prepare("SELECT source FROM metric_hits WHERE id = ? AND stage = ?").bind(id, "banner").all<{ source: string | null }>();
    const imagem = lerImagemDeDataUrl(results?.[0]?.source);
    if (!imagem) return new Response(null, { status: 404 });
    return new Response(imagem.bytes as BodyInit, {
      headers: {
        "content-type": imagem.tipo,
        "content-length": String(imagem.bytes.length),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
