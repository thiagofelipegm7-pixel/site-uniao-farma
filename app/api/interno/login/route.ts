import { NextResponse } from "next/server";
import { STAFF_COOKIE, STAFF_SESSION_SECONDS, checkStaffLogin, createStaffSession } from "../../../staff-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRIES = 8;

function clientKey(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
}

function allowAttempt(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_TRIES;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const user = String(form.get("user") || "");
  const pass = String(form.get("pass") || "");
  const nextPath = String(form.get("next") || "/interno/metricas");
  const safeNext = nextPath.startsWith("/interno") ? nextPath : "/interno/metricas";

  if (!allowAttempt(clientKey(request))) {
    const url = new URL("/interno/entrar", request.url);
    url.searchParams.set("erro", "1");
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!checkStaffLogin(user, pass)) {
    const url = new URL("/interno/entrar", request.url);
    url.searchParams.set("erro", "1");
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  response.cookies.set(STAFF_COOKIE, await createStaffSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: STAFF_SESSION_SECONDS,
  });
  return response;
}
