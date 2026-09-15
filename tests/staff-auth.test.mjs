import assert from "node:assert/strict";
import test from "node:test";

test("staff session is signed and expires", async () => {
  process.env.STAFF_USER = "uniao";
  process.env.STAFF_PASSWORD = "teste-secreto";
  const { checkStaffLogin, createStaffSession, verifyStaffSession } = await import("../app/staff-auth.ts");

  assert.equal(checkStaffLogin("uniao", "teste-secreto"), true);
  assert.equal(checkStaffLogin("uniao", "errada"), false);

  const token = await createStaffSession();
  assert.equal(token.includes(":"), false);
  assert.equal(token.includes("teste-secreto"), false);
  assert.equal(await verifyStaffSession(token), true);
  assert.equal(await verifyStaffSession("v1.1.abc"), false);
});
