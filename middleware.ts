import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_COOKIE, staffToken } from "./app/staff-auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/interno/:path*", "/api/metricas"],
};
