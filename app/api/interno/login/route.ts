import { NextResponse } from "next/server";
import { STAFF_COOKIE, STAFF_SESSION_SECONDS, checkStaffLogin, createStaffSession } from "../../../staff-auth";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginAttempts = globalThis as typeof globalThis & {
  __ufLoginAttempts?: Map<string, { count: number; resetAt: number }>;
};

// Limitacao conhecida: este Map vive no isolate do Worker. Em Cloudflare
// o contador nao e compartilhado entre isolados. KV/Durable Object unificaria
// o limite, mas e desproporcional ao volume atual do painel interno.
function attemptStore() {
  if (!loginAttempts.__ufLoginAttempts) loginAttempts.__ufLoginAttempts = new Map();
  return loginAttempts.__ufLoginAttempts;
}

function clientKey(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(key: string) {
  const entry = attemptStore().get(key);
  if (!entry) return false;
  if (entry.resetAt <= Date.now()) {
    attemptStore().delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_FAILURES;
}

function rememberFailure(key: string) {
  const now = Date.now();
  const current = attemptStore().get(key);
  if (!current || current.resetAt <= now) {
    attemptStore().set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
}

export async function POST(request: Request) {
  const key = clientKey(request);
  if (isRateLimited(key)) {
    return NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "900" } },
    );
  }

  const form = await request.formData();
  const user = String(form.get("user") || "");
  const pass = String(form.get("pass") || "");
  const nextPath = String(form.get("next") || "/interno/metricas");
  const safeNext = nextPath.startsWith("/interno") ? nextPath : "/interno/metricas";

  if (!checkStaffLogin(user, pass)) {
    rememberFailure(key);
    const url = new URL("/interno/entrar", request.url);
    url.searchParams.set("erro", "1");
    url.searchParams.set("next", safeNext);
    return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  attemptStore().delete(key);
  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  response.cookies.set(STAFF_COOKIE, await createStaffSession(), {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: STAFF_SESSION_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
