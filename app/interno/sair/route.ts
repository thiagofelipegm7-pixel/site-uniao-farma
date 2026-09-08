import { NextResponse } from "next/server";
import { STAFF_COOKIE } from "../../staff-auth";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/interno/entrar", request.url));
  response.cookies.set(STAFF_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
