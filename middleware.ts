import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function unauthorized() {
  return new NextResponse("Área interna. Entre com usuário e senha.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Uniao Farma interno", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export function middleware(request: NextRequest) {
  const user = process.env.STAFF_USER?.trim() || "uniao";
  const pass = process.env.STAFF_PASSWORD?.trim();
  if (!pass) return unauthorized();

  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Basic ")) return unauthorized();

  try {
    const decoded = atob(header.slice(6));
    const split = decoded.indexOf(":");
    const givenUser = decoded.slice(0, split);
    const givenPass = decoded.slice(split + 1);
    if (givenUser === user && givenPass === pass) return NextResponse.next();
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/interno/:path*", "/api/metricas"],
};
