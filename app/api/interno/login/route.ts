import { NextResponse } from "next/server";
import { STAFF_COOKIE, checkStaffLogin, staffToken } from "../../../staff-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const user = String(form.get("user") || "");
  const pass = String(form.get("pass") || "");
  const nextPath = String(form.get("next") || "/interno/metricas");
  const safeNext = nextPath.startsWith("/interno") ? nextPath : "/interno/metricas";

  if (!checkStaffLogin(user, pass)) {
    const url = new URL("/interno/entrar", request.url);
    url.searchParams.set("erro", "1");
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  response.cookies.set(STAFF_COOKIE, staffToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
