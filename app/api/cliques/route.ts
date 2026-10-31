import { getAllowedClickPaths, recordClick } from "../../click-counter";
import { CLICK_MAX_BODY_BYTES, isObviousBot, parseClickBody } from "../../click-counter-rules";

const HEADERS = { "Cache-Control": "no-store" };

/**
 * Recebe só { path, button, store }. Não lê nem guarda IP, cookie ou ID.
 * O user agent é usado apenas para ignorar bots óbvios e não é gravado.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    let sameSite = false;
    try {
      sameSite = new URL(origin).host === new URL(request.url).host;
    } catch {
      sameSite = false;
    }
    if (!sameSite) return new Response(null, { status: 403, headers: HEADERS });
  }

  if (isObviousBot(request.headers.get("user-agent"))) {
    return new Response(null, { status: 204, headers: HEADERS });
  }

  const text = await request.text().catch(() => "");
  if (text.length > CLICK_MAX_BODY_BYTES) return new Response(null, { status: 413, headers: HEADERS });

  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  const click = parseClickBody(body, getAllowedClickPaths());
  if (!click) return new Response(null, { status: 400, headers: HEADERS });

  try {
    await recordClick(click);
  } catch {
    return new Response(null, { status: 503, headers: HEADERS });
  }
  return new Response(null, { status: 204, headers: HEADERS });
}
