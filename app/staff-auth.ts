export const STAFF_COOKIE = "uf_staff";

function encodeToken(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getStaffCredentials() {
  return {
    user: process.env.STAFF_USER?.trim() || "uniao",
    pass: process.env.STAFF_PASSWORD?.trim() || "",
  };
}

export function staffToken() {
  const { user, pass } = getStaffCredentials();
  return encodeToken(`${user}:${pass || "pending"}`);
}

export function checkStaffLogin(user: string, pass: string) {
  const expected = getStaffCredentials();
  if (!expected.pass) return false;
  return user.trim() === expected.user && pass === expected.pass;
}
