import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("W-12/W-13/W-15/W-23/W-24: landing page /pedir-agora blindada (sem menu de fuga, 1 CTA coerente, 4 Ps e prova real)", async () => {
  const lp = await ler("app/pedir-agora/page.tsx");
  assert.match(lp, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.doesNotMatch(lp, /ShopHeader|ContentSiteHeader|SubmenuHome/); // W-13: sem menu de fuga
  assert.match(lp, /CTA_ROTULO = "Pedir no WhatsApp da loja \(resposta em 5 min\)"/); // W-12: CTA único coerente
  assert.match(lp, /porque/i); // W-23: ponte benefício + porque + recurso
  assert.match(lp, /AVALIACOES_CESTA/); // W-24/W-25/K-1: só avaliação real
  assert.match(lp, /<NotasGoogle/);
  assert.match(lp, /COMPANY\.pharmacist\.lookupUrl/); // R-03/V-01
  assert.match(lp, /Controlados da Portaria 344\/98 não são vendidos online/); // R-07
});

test("W-06/W-23/W-24/W-28..W-34: ponte 'porque' em ofertas/receita/entrega, provas em ofertas e manual operacional", async () => {
  const [ofertas, receita, entrega, manual, regras] = await Promise.all([
    ler("app/ofertas/OffersPageClient.tsx"),
    ler("app/receita/ConfiancaReceita.tsx"),
    ler("app/entrega-de-medicamentos-em-sabara/ProvaEntrega.tsx"),
    ler("docs/manual-copywriting-operacional.md"),
    ler("COPYWRITING.md"),
  ]);
  assert.match(ofertas, /porque/i);
  assert.match(ofertas, /WHATSAPP_SLA/);
  assert.match(ofertas, /<NotasGoogle/);
  assert.match(receita, /Você não perde viagem porque/);
  assert.match(entrega, /Você sabe quanto vai pagar antes de pedir porque/);
  assert.match(manual, /Fibonacci/);
  assert.match(manual, /\/pedir-agora/);
  assert.match(manual, /Swipe File/);
  assert.match(regras, /W-34/);
});
