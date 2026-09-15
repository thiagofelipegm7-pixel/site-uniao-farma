import assert from "node:assert/strict";
import test from "node:test";

test("staff session is signed without embedding the password", async () => {
  process.env.STAFF_USER = "uniao";
  process.env.STAFF_PASSWORD = "senha-loja";
  process.env.STAFF_SECRET = "chave-separada";
  const { checkStaffLogin, createStaffSession, verifyStaffSession } = await import("../app/staff-auth.ts");

  assert.equal(checkStaffLogin("uniao", "senha-loja"), true);
  assert.equal(checkStaffLogin("uniao", "errada"), false);

  const token = await createStaffSession();
  assert.equal(token.includes("senha-loja"), false);
  assert.equal(token.includes("chave-separada"), false);
  assert.equal(await verifyStaffSession(token), true);
  assert.equal(await verifyStaffSession("v1.1.abc"), false);
});
