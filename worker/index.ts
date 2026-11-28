/** Cloudflare Worker entry point — União Farma (Vinext + Cloudflare Workers). */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { classificarBotIa, origemReferenciaIa } from "../app/seo-ia/telemetria-ia";
import { CACHE_CONTROL_HTML_PUBLICO, decidirCacheBorda, respostaPodeSerGuardada } from "../app/seo-ia/cache-borda";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CATALOGO_READ_TOKEN?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

type CacheDaBorda = { default: { match(chave: Request): Promise<Response | undefined>; put(chave: Request, resposta: Response): Promise<void> } };

/**
 * Páginas pesadas de catálogo (hub, produto, departamento) para visitas anônimas: acerto sai pronto, erro monta e guarda.
 * Qualquer falha do cache cai no caminho normal, então o pior caso é o comportamento de antes.
 */
async function comCacheDeBorda(request: Request, env: Env, ctx: ExecutionContext, decisao: { chave: string; ttl: number }): Promise<Response> {
  const cache = (globalThis as unknown as { caches?: CacheDaBorda }).caches?.default;
  if (!cache) return handler.fetch(request, env, ctx);
  const chave = new Request(decisao.chave, { method: "GET" });
  try {
    const guardada = await cache.match(chave);
    if (guardada) {
      const resposta = new Response(guardada.body, guardada);
      resposta.headers.set("Cache-Control", CACHE_CONTROL_HTML_PUBLICO);
      const vary = resposta.headers.get("x-uf-vary");
      resposta.headers.delete("x-uf-vary");
      if (vary) resposta.headers.set("Vary", vary);
      resposta.headers.set("X-UF-Cache", "hit");
      // Telemetria por requisição: a cópia guardada não pode carregar a marca de quem a gerou.
      resposta.headers.delete("X-UF-AI-Bot");
      resposta.headers.delete("X-UF-AI-Ref");
      const bot = classificarBotIa(request.headers.get("user-agent"));
      if (bot) resposta.headers.set("X-UF-AI-Bot", `${bot.tipo}:${bot.bot}`);
      const refIa = origemReferenciaIa(request.headers.get("referer"));
      if (refIa) resposta.headers.set("X-UF-AI-Ref", refIa);
      return resposta;
    }
  } catch {
    return handler.fetch(request, env, ctx);
  }
  const original = await handler.fetch(request, env, ctx);
  if (!respostaPodeSerGuardada(original)) return original;
  try {
    const paraGuardar = new Response(original.clone().body, original);
    // O Cache API usa o Cache-Control da resposta para a validade e ignora Vary de forma irregular: guarda o Vary à parte.
    const vary = paraGuardar.headers.get("Vary");
    paraGuardar.headers.delete("Vary");
    if (vary) paraGuardar.headers.set("x-uf-vary", vary);
    paraGuardar.headers.delete("X-UF-AI-Bot");
    paraGuardar.headers.delete("X-UF-AI-Ref");
    paraGuardar.headers.set("Cache-Control", `public, max-age=${decisao.ttl}`);
    ctx.waitUntil(cache.put(chave, paraGuardar).catch(() => undefined));
  } catch {
    return original;
  }
  const resposta = new Response(original.body, original);
  resposta.headers.set("X-UF-Cache", "miss");
  return resposta;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const decisao = decidirCacheBorda(request);
    if (!decisao) return handler.fetch(request, env, ctx);
    return comCacheDeBorda(request, env, ctx, decisao);
  },

  /**
   * Tarefas agendadas (crons do wrangler):
   *  - 00:30 UTC (21h30 em Brasília): guarda o estoque do dia no D1 para os alertas do painel interno;
   *  - a cada 30 min no horário da loja: confere se o PC da loja ainda envia o estoque e avisa no celular se parar.
   */
  async scheduled(evento: { cron?: string }, env: Env, ctx: ExecutionContext): Promise<void> {
    if (!env.CATALOGO_READ_TOKEN) return;
    const caminho = evento.cron === "30 0 * * *" ? "/api/estoque-snapshot" : "/api/estoque-alerta";
    const pedido = new Request(`https://xn--uniofarmasabar-8gbu.com.br${caminho}`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.CATALOGO_READ_TOKEN}` },
    });
    ctx.waitUntil(handler.fetch(pedido, env, ctx).then(() => undefined));
    // A cada 30 min: se há fotos enviadas pelo painel esperando, pede a publicação em lote (poupa os minutos grátis do GitHub).
    if (evento.cron !== "30 0 * * *") {
      const publicar = new Request("https://xn--uniofarmasabar-8gbu.com.br/api/fotos-publicar", {
        method: "POST",
        headers: { authorization: `Bearer ${env.CATALOGO_READ_TOKEN}` },
      });
      ctx.waitUntil(handler.fetch(publicar, env, ctx).then(() => undefined));
    }
  },
};

export default worker;
