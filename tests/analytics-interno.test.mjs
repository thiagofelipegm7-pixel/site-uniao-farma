import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("analytics: telas internas da equipe ficam fora da medição, sem banner, sem cliques e sem pixel", async () => {
  const { getGtagBootstrapScript, GA_MEASUREMENT_ID } = await import("../app/ga-bootstrap.ts");
  const script = getGtagBootstrapScript();
  const desliga = script.indexOf(`ga-disable-${GA_MEASUREMENT_ID}`);
  assert.ok(desliga >= 0 && desliga < script.indexOf("gtag('config'"), "a chave que desliga o GA vem antes do config");
  assert.match(script, /location\.pathname\.indexOf\('\/interno'\)===0/);
  const consent = await readFile(new URL("../app/AnalyticsConsent.tsx", import.meta.url), "utf8");
  assert.match(consent, /!interno && \(consent === null/, "banner não aparece no painel");
  assert.match(consent, /consent === "accepted" && !interno/, "pixel/GA não iniciam no painel");
  assert.match(consent, /if \(interno\) return;/, "cliques da equipe não são medidos");
});
