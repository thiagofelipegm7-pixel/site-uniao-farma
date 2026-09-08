export const STAFF_COOKIE = "uf_staff";

export function getStaffCredentials() {
  return {
    user: process.env.STAFF_USER?.trim() || "uniao",
    pass: process.env.STAFF_PASSWORD?.trim() || "farma2026",
  };
}

export function staffToken() {
  const { user, pass } = getStaffCredentials();
  return Buffer.from(`${user}:${pass}`).toString("base64url");
}

export function checkStaffLogin(user: string, pass: string) {
  const expected = getStaffCredentials();
  return user.trim() === expected.user && pass === expected.pass;
}
