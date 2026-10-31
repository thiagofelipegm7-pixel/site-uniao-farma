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
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://www.google.com https://pagead2.googlesyndication.com https://www.facebook.com https://connect.facebook.net https://cloudflareinsights.com; frame-src https://maps.google.com https://www.google.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'",
} as const;

function withSecurityHeaders(response: NextResponse, noStore = false) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (noStore) response.headers.set("Cache-Control", "no-store");
  return response;
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

const PAINEL_PATH = "/painel-cliques";

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

/** Senha do painel de cliques: HTTP Basic, qualquer usuário, senha = secret PAINEL_SENHA. Sem secret, fica fechado. */
async function guardPainel(request: NextRequest) {
  const expected = process.env.PAINEL_SENHA?.trim() || "";
  const deny = (status: number, body: string, challenge: boolean) => {
    const response = new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    if (challenge) response.headers.set("WWW-Authenticate", 'Basic realm="Painel de cliques", charset="UTF-8"');
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return withSecurityHeaders(response, true);
  };
  if (!expected) return deny(503, "Painel desligado: falta configurar o secret PAINEL_SENHA.", false);

  const header = request.headers.get("authorization") || "";
  if (/^basic /i.test(header)) {
    try {
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0)));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
      let diff = 0;
      for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
      if (diff === 0) {
        const response = withSecurityHeaders(NextResponse.next(), true);
        response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
        return response;
      }
    } catch {
      // cabeçalho inválido: cai no desafio abaixo
    }
  }
  return deny(401, "Senha necessária.", true);
}

export async function middleware(request: NextRequest) {
  const canonical = redirectToCanonicalHost(request);
  if (canonical) return canonical;

  const { pathname } = request.nextUrl;
  if (pathname === PAINEL_PATH || pathname.startsWith(`${PAINEL_PATH}/`)) return guardPainel(request);
  const noStore =
    pathname.startsWith("/interno") ||
    pathname === "/api/metricas" ||
    pathname === "/api/cliques" ||
    pathname === "/api/interno/login" ||
    pathname === "/api/whatsapp/webhook";
  const staffPath = pathname.startsWith("/interno") || pathname === "/api/metricas";
  if (!staffPath) return withSecurityHeaders(NextResponse.next(), noStore);
  if (pathname === "/interno/entrar" || pathname === "/interno/sair") {
    return withSecurityHeaders(NextResponse.next(), noStore);
  }

  if (await verifyStaffSession(request.cookies.get(STAFF_COOKIE)?.value)) {
    return withSecurityHeaders(NextResponse.next(), noStore);
  }

  const login = request.nextUrl.clone();
  login.pathname = "/interno/entrar";
  login.searchParams.set("next", pathname);
  return withSecurityHeaders(NextResponse.redirect(login), noStore);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
