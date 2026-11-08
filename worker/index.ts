/** Cloudflare Worker entry point — União Farma (Vinext + Cloudflare Workers). */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

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

    return handler.fetch(request, env, ctx);
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
