import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const ler = (a) => readFile(new URL(`../${a}`, import.meta.url), "utf8");

test("S-08: cada produto do sitemap usa a data real da última alteração, não a da exportação do catálogo", async () => {
  const [sitemap, gerador, workflow, datasTxt] = await Promise.all([
    ler("app/sitemap.ts"),
    ler("scripts/gerar-assets-catalogo.mjs"),
    ler(".github/workflows/catalogo-sync.yml"),
    ler("app/nacoes-unidas/produtos/dados/datas-produtos.json"),
  ]);
  const datas = JSON.parse(datasTxt);
  const valores = Object.values(datas);
  assert.ok(valores.length > 1000, "arquivo cobre o catálogo");
  for (const [assinatura, dia] of valores) {
    assert.match(assinatura, /^[0-9a-f]{12}$/);
    assert.match(dia, /^\d{4}-\d{2}-\d{2}$/);
  }
  // Datas espalhadas: nenhum dia concentra quase todos os produtos (era 941 de 943 com a data do build).
  const porDia = {};
  for (const [, dia] of valores) porDia[dia] = (porDia[dia] ?? 0) + 1;
  assert.ok(Math.max(...Object.values(porDia)) < valores.length * 0.5, "datas não podem ser todas iguais");
  // O gerador só troca a data quando a assinatura muda, e o sitemap lê o arquivo.
  assert.match(gerador, /antes && antes\[0\] === assinatura \? antes : \[assinatura, hoje\]/);
  assert.match(sitemap, /DATAS_PRODUTOS\[slugify\(item\.nome\)\]/);
  // A sincronização automática commita o arquivo junto com o catálogo.
  assert.match(workflow, /git add [^\n]*app\/nacoes-unidas\/produtos\/dados\/datas-produtos\.json/);
});
