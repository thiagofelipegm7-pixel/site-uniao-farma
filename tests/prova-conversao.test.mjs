import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("C-08/C-16: notas reais do Google na home e ao lado do botão de comprar, da fonte única", async () => {
  const [notas, home, produto] = await Promise.all([ler("app/shop/NotasGoogle.tsx"), ler("app/HomePage.tsx"), ler("app/nacoes-unidas/produtos/[slug]/page.tsx")]);
  assert.match(notas, /NOTAS_GOOGLE_LOJAS/); // L-1: nada digitado à mão aqui
  assert.match(notas, /urlAvaliacoes/); // dá para conferir no Google
  assert.match(home, /<NotasGoogle className="notas-google--home" \/>/);
  assert.match(produto, /<RespostasCompra \/>/);
});

test("P-15/R-06: página de medicamento não mostra avaliação", async () => {
  const produto = await ler("app/nacoes-unidas/produtos/[slug]/page.tsx");
  assert.match(produto, /ehMedicamentoOuDuvida\(item\) \? null : <NotasGoogle \/>/);
});

test("C-13/C-14/P-20: respostas perto do botão e aviso pós-clique com prazo real confirmado (5 minutos)", async () => {
  const [{ WHATSAPP_SLA }, respostas, pos, fluxo] = await Promise.all([
    import("../app/site-config.ts"),
    ler("app/shop/RespostasCompra.tsx"),
    ler("app/reserva/PosCliqueWhats.tsx"),
    ler("app/reserva/ReservaFluxo.tsx"),
  ]);
  assert.equal(WHATSAPP_SLA, "em até 5 minutos no horário de funcionamento");
  assert.match(respostas, /LinhasConfianca/);
  assert.match(respostas, /não cobra nada/);
  assert.match(pos, /não paga nada/);
  assert.match(pos, /WHATSAPP_SLA/);
  assert.equal((fluxo.match(/<PosCliqueWhats \/>/g) || []).length, 1); // só no resumo; a barra fixa do celular não cresce
});

test("C-08/C-13/C-14/R-05: /receita tem prova real, três objeções, pós-clique com SLA oficial e RT clicável", async () => {
  const [pagina, bloco] = await Promise.all([ler("app/receita/page.tsx"), ler("app/receita/ConfiancaReceita.tsx")]);
  assert.match(pagina, /<ConfiancaReceita \/>/);
  assert.match(bloco, /<NotasGoogle className="notas-google--receita" \/>/);
  assert.match(bloco, /Preciso pagar agora\?/);
  assert.match(bloco, /Minha receita fica salva no site\?/);
  assert.match(bloco, /E se faltar um remédio/);
  assert.match(bloco, /avaliação\s+do farmacêutico/);
  assert.match(bloco, /COMPANY\.pharmacist\.lookupUrl/);
  assert.match(bloco, /WHATSAPP_SLA/);
});

test("C-17/C-23/R-06: prova real de entrega, Plano B sem medicamento e roteiro C-22", async () => {
  const [planoB, provaEntrega, home, depto, loja, entrega, roteiro] = await Promise.all([
    ler("app/shop/PlanoBOfertas.tsx"),
    ler("app/entrega-de-medicamentos-em-sabara/ProvaEntrega.tsx"),
    ler("app/HomePage.tsx"),
    ler("app/departamentos/[slug]/page.tsx"),
    ler("app/nacoes-unidas/produtos/page.tsx"),
    ler("app/entrega-de-medicamentos-em-sabara/page.tsx"),
    ler("docs/roteiro-atendimento-whatsapp.md"),
  ]);
  assert.match(planoB, /OFFERS_GROUP_URL/);
  assert.match(planoB, /Ainda não vai comprar hoje\?/);
  assert.match(home, /<PlanoBOfertas \/>/);
  assert.match(loja, /<PlanoBOfertas \/>/);
  assert.match(entrega, /<ProvaEntrega \/>/);
  assert.match(entrega, /<PlanoBOfertas \/>/);
  // P-15/R-06: departamento de medicamentos não recebe avaliações nem Plano B promocional.
  assert.match(depto, /dep\.slug === "medicamentos" \? null : \(\s*<div className="section-inner">\s*<NotasGoogle \/>\s*<PlanoBOfertas \/>/);
  assert.match(provaEntrega, /AVALIACOES_CESTA/); // L-1: só avaliação real do Google
  assert.match(provaEntrega, /Preciso pagar adiantado\?/);
  assert.match(provaEntrega, /WHATSAPP_SLA/);
  assert.match(roteiro, /C-22/);
  assert.match(roteiro, /5 minutos/);
});
