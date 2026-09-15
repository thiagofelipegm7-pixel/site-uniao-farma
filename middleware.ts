import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_COOKIE, staffToken } from "./app/staff-auth";

const CANONICAL_HOST = "xn--uniofarmasabar-8gbu.com.br";

function redirectToCanonicalHost(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const proto = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")).toLowerCase();
  const url = request.nextUrl.clone();
  let changed = false;

  if (host.startsWith("www.")) {
    url.host = host.slice(4);
    changed = true;
  }
  if (host && host !== "localhost" && host !== CANONICAL_HOST && host.endsWith(".workers.dev") === false) {
    if (host.replace(/^www\./, "") === CANONICAL_HOST) {
      url.host = CANONICAL_HOST;
      changed = true;
    }
  }
  if (proto === "http" && host !== "localhost") {
    url.protocol = "https:";
    changed = true;
  }
  if (changed) {
    return NextResponse.redirect(url, 301);
  }
  return null;
}

export function middleware(request: NextRequest) {
  const canonical = redirectToCanonicalHost(request);
  if (canonical) return canonical;

  const { pathname } = request.nextUrl;
  const staffPath = pathname.startsWith("/interno") || pathname === "/api/metricas";
  if (!staffPath) return NextResponse.next();
  if (pathname === "/interno/entrar" || pathname === "/interno/sair") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(STAFF_COOKIE)?.value;
  if (cookie && cookie === staffToken()) {
    return NextResponse.next();
  }

  const login = request.nextUrl.clone();
  login.pathname = "/interno/entrar";
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
