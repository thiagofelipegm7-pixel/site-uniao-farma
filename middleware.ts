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
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com; frame-src https://maps.google.com https://www.google.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'",
} as const;

function withSecurityHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
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

export async function middleware(request: NextRequest) {
  const canonical = redirectToCanonicalHost(request);
  if (canonical) return canonical;

  const { pathname } = request.nextUrl;
  const staffPath = pathname.startsWith("/interno") || pathname === "/api/metricas";
  if (!staffPath) return withSecurityHeaders(NextResponse.next());
  if (pathname === "/interno/entrar" || pathname === "/interno/sair") {
    return withSecurityHeaders(NextResponse.next());
  }

  if (await verifyStaffSession(request.cookies.get(STAFF_COOKIE)?.value)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const login = request.nextUrl.clone();
  login.pathname = "/interno/entrar";
  login.searchParams.set("next", pathname);
  return withSecurityHeaders(NextResponse.redirect(login));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
