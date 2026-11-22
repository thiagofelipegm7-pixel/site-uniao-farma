import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (arquivo) => readFile(new URL(`../${arquivo}`, import.meta.url), "utf8");

const { elegivelGoogle, motivoForaGoogle, itensElegiveisGoogle, ehMedicamentoOuDuvida, gtinValido } = await import("../app/nacoes-unidas/produtos/google-shopping.ts");
const { itensDoFeed, xmlDoFeed, xmlDoFeedEmCache, limparCacheDoFeed, FEED_CACHE_MS, escaparXml, idDoFeed, FEED_GOOGLE_PATH } = await import("../app/nacoes-unidas/produtos/google-shopping-feed.ts");
const { carregarCatalogoCompleto, slugify } = await import("../app/nacoes-unidas/produtos/catalogo.ts");
const { carregarRestritos } = await import("../app/nacoes-unidas/produtos/receita.ts");
const { fotoDoProduto } = await import("../app/nacoes-unidas/produtos/imagens.ts");
const { jsonLdProduto, NOTA_PRECO, NOTA_PRECO_FIRME } = await import("../app/nacoes-unidas/produtos/produto.ts");

const catalogo = carregarCatalogoCompleto().itens;
const elegiveis = itensElegiveisGoogle();

test("Google: nenhum medicamento entra (MIP, categoria Medicamentos, receita, controlados, consulte)", () => {
  assert.ok(elegiveis.length > 500, `poucos itens elegíveis: ${elegiveis.length}`);
  const r = carregarRestritos();
  const restritos = new Set([...r.receita, ...r.controlados, ...r.consulte].map((i) => slugify(i.nome)));
  for (const i of elegiveis) {
    assert.notEqual(i.categoria, "Medicamentos", i.nome);
    assert.equal(i.isMIP, false, i.nome);
    assert.ok(!restritos.has(slugify(i.nome)), `${i.nome} está nas listas restritas`);
    assert.ok(!ehMedicamentoOuDuvida(i), i.nome);
  }
  for (const i of catalogo.filter((x) => x.categoria === "Medicamentos" || x.isMIP)) assert.equal(elegivelGoogle(i, catalogo), false, i.nome);
});

test("Google: só item em estoque, com foto, preço válido e endereço único", () => {
  for (const i of elegiveis) {
    assert.notEqual(i.esgotado, true, i.nome);
    assert.ok(fotoDoProduto(i.nome), i.nome);
    assert.ok(i.preco > 0, i.nome);
    assert.equal(catalogo.filter((x) => slugify(x.nome) === slugify(i.nome)).length, 1, i.nome);
  }
  const base = { lab: "Marca", categoria: "Beleza", preco: 10, isMIP: false };
  assert.equal(motivoForaGoogle({ ...base, nome: "DIPIRONA 500MG 10 COMP" }, []), "nome_medicamento");
  assert.equal(motivoForaGoogle({ ...base, nome: "XAROPE DE GUACO 120ML" }, []), "nome_medicamento");
  assert.equal(motivoForaGoogle({ ...base, nome: "AGUA BORICADA 100ML" }, []), "enquadramento_a_confirmar");
  assert.equal(motivoForaGoogle({ ...base, nome: "CHUPETA NUK" }, []), "nbcal");
  assert.equal(motivoForaGoogle({ ...base, nome: "SHAMPOO X 200ML", esgotado: true }, []), "esgotado");
  assert.equal(motivoForaGoogle({ ...base, nome: "SHAMPOO QUE NAO EXISTE 123" }, []), "sem_foto");
  assert.equal(motivoForaGoogle({ ...base, categoria: "Medicamentos", nome: "SHAMPOO X" }, []), "categoria");
  assert.equal(motivoForaGoogle({ ...base, isMIP: true, nome: "SHAMPOO X" }, []), "mip");
});

test("GTIN: dígito verificador", () => {
  assert.equal(gtinValido("7891010009618"), true);
  assert.equal(gtinValido("7891010009619"), false);
  assert.equal(gtinValido("123"), false);
  assert.equal(gtinValido(null), false);
});

test("feed: XML RSS 2.0 com namespace g:, campos obrigatórios e só itens elegíveis", () => {
  assert.equal(FEED_GOOGLE_PATH, "/feeds/google-shopping.xml");
  const linhas = itensDoFeed();
  assert.equal(linhas.length, elegiveis.length);
  const ids = new Set(linhas.map((l) => l.id));
  assert.equal(ids.size, linhas.length, "id único");
  for (const l of linhas) {
    assert.ok(l.id.length <= 50, l.id);
    assert.ok(l.title && l.title.length <= 150, l.id);
    assert.ok(l.description, l.id);
    assert.match(l.link, /^https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/nacoes-unidas\/produtos\/[a-z0-9-]+$/);
    assert.match(l.image_link, /^https:\/\/xn--uniofarmasabar-8gbu\.com\.br\/produtos\/\d{8,14}\.webp$/);
    assert.match(l.price, /^\d+\.\d{2} BRL$/);
    assert.equal(l.availability, "in_stock");
    assert.equal(l.condition, "new");
    if (l.gtin) assert.ok(gtinValido(l.gtin), l.gtin);
  }
  const xml = xmlDoFeed(linhas);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0" xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0">/);
  assert.equal((xml.match(/<item>/g) ?? []).length, linhas.length);
  assert.doesNotMatch(xml, /&(?!amp;|lt;|gt;|quot;|apos;)/, "& sem escape");
  assert.equal(escaparXml(`a & <b> "c" 'd'`), "a &amp; &lt;b&gt; &quot;c&quot; &apos;d&apos;");
  assert.equal(idDoFeed("a".repeat(80)).length <= 50, true);
});

test("rota do feed, sitemap, rodapé e JSON-LD usam a mesma fonte de elegibilidade", async () => {
  const [rota, sitemap, rodape, pagina] = await Promise.all([
    read("app/feeds/google-shopping.xml/route.ts"),
    read("app/sitemap.ts"),
    read("app/SiteFooter.tsx"),
    read("app/nacoes-unidas/produtos/[slug]/page.tsx"),
  ]);
  assert.match(rota, /xmlDoFeed/);
  assert.match(rota, /application\/xml/);
  assert.match(sitemap, /itensElegiveisGoogle\(\)/);
  assert.match(sitemap, /\/trocas-e-devolucoes/);
  assert.match(rodape, /href="\/trocas-e-devolucoes"/);
  assert.match(pagina, /oferta: noGoogle \?/);
  const semOferta = jsonLdProduto({ nome: "X", lab: "Y", categoria: "Beleza", url: "https://exemplo/p" });
  assert.equal(semOferta.offers, undefined);
  const comOferta = jsonLdProduto({ nome: "X", lab: "Y", categoria: "Beleza", url: "https://exemplo/p", oferta: { preco: 12.5, gtin: "7891010009618" } });
  assert.deepEqual(comOferta.offers, {
    "@type": "Offer",
    price: "12.50",
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    url: "https://exemplo/p",
    seller: { "@type": "Organization", name: "União Farma Nações Unidas" },
  });
  assert.equal(comOferta.gtin, "7891010009618");
  assert.match(NOTA_PRECO_FIRME, /preço do site vale/);
  assert.match(NOTA_PRECO, /confirma preço e estoque/);
});

test("trocas e devoluções, FAQ e termos: sem 'sem carrinho', sem 'institucional' e com a regra do medicamento", async () => {
  const [trocas, seo, termos] = await Promise.all([read("app/trocas-e-devolucoes/page.tsx"), read("app/seo-content.ts"), read("app/termos/page.tsx")]);
  assert.match(trocas, /7 dias/);
  assert.match(trocas, /art\. 49 do Código de Defesa do Consumidor/);
  assert.match(trocas, /medicamento só tem\s+troca ou devolução em caso de defeito/);
  assert.match(trocas, /canonical: "\/trocas-e-devolucoes"/);
  assert.match(trocas, /devolvido pelo mesmo meio de pagamento usado na compra/);
  assert.doesNotMatch(trocas, /index: false/);
  assert.doesNotMatch(seo, /carrinho virtual/);
  assert.match(seo, /vale o preço mostrado no site/);
  assert.doesNotMatch(termos, /site institucional/);
  assert.match(termos, /vale\s+o preço mostrado no site/);
});

test("verificação do Merchant Center (meta tag) fica no layout raiz, junto com a do Search Console", async () => {
  const layout = await read("app/layout.tsx");
  assert.match(layout, /GOOGLE_MERCHANT_VERIFICATION = "c78h12yeN5NoYIfoDpPllCzysv9i6tIFAJyYKV8TEAo"/);
  assert.match(layout, /google: GOOGLE_SITE_VERIFICATION,/);
  assert.match(layout, /"google-site-verification": GOOGLE_MERCHANT_VERIFICATION/);
});

test("feed: XML em cache por 1 hora não remonta a cada chamada, e a rota pede max-age=3600", async () => {
  assert.equal(FEED_CACHE_MS, 3_600_000);
  limparCacheDoFeed();
  const a = xmlDoFeedEmCache(1_000);
  const b = xmlDoFeedEmCache(1_000 + 10_000);
  assert.equal(a, b);
  assert.equal(a, xmlDoFeed());
  const rota = await read("app/feeds/google-shopping.xml/route.ts");
  assert.match(rota, /xmlDoFeedEmCache/);
  assert.match(rota, /max-age=3600, s-maxage=3600, stale-while-revalidate=86400/);
});
