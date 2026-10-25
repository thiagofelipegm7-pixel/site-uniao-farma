import assert from "node:assert/strict";
import test from "node:test";
import { getDayRule, addSaoPauloDays, getSaoPauloDateKey } from "../app/hours-exceptions.ts";

test("national holidays stay closed until a store override exists", () => {
  const natal = getDayRule("2026-12-25");
  assert.equal(natal?.type, "closed");
  assert.match(natal?.name ?? "", /Natal/);
});

test("christmas eve uses reduced hours", () => {
  const eve = getDayRule("2026-12-24");
  assert.equal(eve?.type, "special");
  if (eve?.type === "special") {
    assert.equal(eve.open, "07:00");
    assert.equal(eve.close, "12:00");
  }
});

test("calendar date math stays on the civil day", () => {
  assert.equal(addSaoPauloDays("2026-12-31", 1), "2027-01-01");
  assert.equal(getSaoPauloDateKey(new Date("2026-12-25T15:00:00-03:00")), "2026-12-25");
});

test("Finados 2026 uses Sunday hours for all 3 stores", async () => {
  const { UNITS } = await import("../app/site-config.ts");
  assert.equal(UNITS.length, 3);
  for (const unit of UNITS) {
    const rule = getDayRule("2026-11-02", unit.id);
    assert.equal(rule?.type, "special");
    assert.equal(rule.open, unit.schedule.sun.open);
    assert.equal(rule.close, unit.schedule.sun.close);
  }
  assert.equal(getDayRule("2026-11-15")?.type, "closed");
});
