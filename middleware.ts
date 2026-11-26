import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_COOKIE, verifyStaffSession } from "./app/staff-auth";

const CANONICAL_HOST = "xn--uniofarmasabar-8gbu.com.br";
const WWW_CANONICAL_HOST = `www.${CANONICAL_HOST}`;

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(self), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://connect.facebook.net https://www.clarity.ms https://scripts.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://www.google.com https://pagead2.googlesyndication.com https://www.facebook.com https://connect.facebook.net https://cloudflareinsights.com https://*.clarity.ms https://c.bing.com; frame-src https://maps.google.com https://www.google.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'",
} as const;

const CACHE_HTML_PUBLICO = "public, s-maxage=60, stale-while-revalidate=300";

function withSecurityHeaders(response: NextResponse, cache: "no-store" | "html-publico" | "deixar" = "deixar") {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (cache === "no-store") response.headers.set("Cache-Control", "no-store");
  else if (cache === "html-publico") response.headers.set("Cache-Control", CACHE_HTML_PUBLICO);
  return response;
}

function cacheDaRota(request: NextRequest, noStore: boolean): "no-store" | "html-publico" | "deixar" {
  const { pathname } = request.nextUrl;
  // Sessão da equipe ou rota privada: nunca cachear (carrinho, reserva, painel, webhooks).
  if (noStore || request.cookies.get(STAFF_COOKIE)?.value) return "no-store";
  // APIs e o feed definem o próprio Cache-Control na rota / no next.config.
  if (pathname.startsWith("/api/") || pathname.startsWith("/feeds/") || pathname === "/sitemap.xml") return "deixar";
  return "html-publico";
}

function redirectToCanonicalHost(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const proto = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")).toLowerCase();
  const url = request.nextUrl.clone();
  let changed = false;

  if (host === WWW_CANONICAL_HOST) {
    url.host = CANONICAL_HOST;
    changed = true;
  }

  const knownHost =
    host === CANONICAL_HOST || host === WWW_CANONICAL_HOST || host === "localhost" || host.endsWith(".workers.dev");
  if (proto === "http" && knownHost && host !== "localhost") {
    url.protocol = "https:";
    changed = true;
  }
  if (changed) return withSecurityHeaders(NextResponse.redirect(url, 301));
  return null;
}

export async function middleware(request: NextRequest) {
  const canonical = redirectToCanonicalHost(request);
  if (canonical) return canonical;

  const { pathname } = request.nextUrl;
  // Toda a API interna exige login da equipe (menos o próprio login). Assim uma rota nova em /api/interno
  // não fica aberta por esquecimento, como aconteceu com /api/interno/banners.
  const apiInterna = pathname.startsWith("/api/interno/") && pathname !== "/api/interno/login";
  const noStore =
    pathname.startsWith("/interno") ||
    pathname.startsWith("/api/interno/") ||
    pathname === "/api/metricas" ||
    pathname === "/api/interno/catalogo" ||
    pathname === "/api/interno/estoque" ||
    pathname === "/api/interno/funil" ||
    pathname === "/api/interno/fotos" ||
    pathname === "/api/interno/fotos/enviar" ||
    pathname === "/api/interno/fotos/baixar" ||
    pathname === "/api/interno/fotos/remover" ||
    pathname === "/api/interno/revisao" ||
    pathname === "/api/interno/erros" ||
    pathname === "/api/erro-cliente" ||
    pathname === "/api/busca-sem-resultado" ||
    pathname === "/api/interno/produto/nome" ||
    pathname === "/api/interno/produto/nome/desfazer" || pathname === "/api/interno/produto/controlado" || pathname === "/api/interno/produto/categoria" || pathname === "/api/interno/produto/categoria/lote" || pathname === "/api/interno/produto/marca" || pathname === "/api/interno/produto/descricao" || pathname === "/api/interno/produto/excluir" ||
    pathname === "/api/interno/revisao/aprovar" ||
    pathname === "/api/interno/revisao/desfazer" ||
    pathname === "/api/catalogo-aprovacoes" ||
    pathname === "/api/fotos-pendentes" ||
    pathname === "/api/interno/login" ||
    pathname === "/api/whatsapp/webhook" ||
    pathname.startsWith("/reserva") ||
    pathname === "/api/pre-vendas";
  const staffPath = apiInterna || pathname.startsWith("/interno") || pathname === "/api/metricas" || pathname === "/api/interno/catalogo" || pathname === "/api/interno/estoque" || pathname === "/api/interno/funil" || pathname === "/api/interno/fotos" || pathname === "/api/interno/fotos/enviar" || pathname === "/api/interno/fotos/baixar" || pathname === "/api/interno/fotos/remover" || pathname === "/api/interno/revisao" || pathname === "/api/interno/revisao/aprovar" || pathname === "/api/interno/revisao/desfazer" || pathname === "/api/interno/produto/nome" || pathname === "/api/interno/produto/nome/desfazer" || pathname === "/api/interno/produto/controlado" || pathname === "/api/interno/produto/categoria" || pathname === "/api/interno/produto/categoria/lote" || pathname === "/api/interno/produto/marca" || pathname === "/api/interno/produto/descricao" || pathname === "/api/interno/produto/excluir" || pathname === "/api/interno/erros";
  if (!staffPath) return withSecurityHeaders(NextResponse.next(), cacheDaRota(request, noStore));
  if (pathname === "/interno/entrar" || pathname === "/interno/sair") {
    return withSecurityHeaders(NextResponse.next(), "no-store");
  }

  if (await verifyStaffSession(request.cookies.get(STAFF_COOKIE)?.value)) {
    return withSecurityHeaders(NextResponse.next(), "no-store");
  }

  const login = request.nextUrl.clone();
  login.pathname = "/interno/entrar";
  login.searchParams.set("next", pathname);
  return withSecurityHeaders(NextResponse.redirect(login), "no-store");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
