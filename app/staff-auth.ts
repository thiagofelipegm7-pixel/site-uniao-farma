export const STAFF_COOKIE = "__Host-uf_staff";
export const STAFF_SESSION_SECONDS = 60 * 60 * 8;

function staffSecret() {
  return process.env.STAFF_PASSWORD?.trim() || "";
}

export function getStaffCredentials() {
  return {
    user: process.env.STAFF_USER?.trim() || "uniao",
    pass: staffSecret(),
  };
}

export function checkStaffLogin(user: string, pass: string) {
  const expected = getStaffCredentials();
  if (!expected.pass) return false;
  return user.trim() === expected.user && pass === expected.pass;
}

async function hmacHex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export async function createStaffSession() {
  const secret = staffSecret();
  if (!secret) throw new Error("STAFF_PASSWORD ausente");
  const expires = String(Date.now() + STAFF_SESSION_SECONDS * 1000);
  const payload = `v1.${expires}`;
  return `${payload}.${await hmacHex(payload, secret)}`;
}

export async function verifyStaffSession(token: string | undefined) {
  if (!token) return false;
  const secret = staffSecret();
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const [, expires, signature] = parts;
  const expiry = Number(expires);
  if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
  const expected = await hmacHex(`v1.${expires}`, secret);
  return sameHex(signature, expected);
}
