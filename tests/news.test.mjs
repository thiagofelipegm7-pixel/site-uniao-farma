import assert from "node:assert/strict";
import test from "node:test";
import {
  NEWS_ARTICLES,
  formatNewsDate,
  getNewsArticle,
  getPublishedNews,
  getRelatedNews,
} from "../app/news-content.ts";

test("publishes only approved news content", () => {
  const published = getPublishedNews();

  assert.equal(published.length, 1);
  assert.equal(published[0].slug, "bem-vindo-area-novidades");
  assert.equal(published[0].publicationStatus, "published");
  assert.equal(published[0].contentApproved, true);
  assert.equal(getNewsArticle("bem-vindo-area-novidades"), published[0]);
  assert.equal(getNewsArticle("nao-existe"), undefined);
});

test("keeps the initial article factual, neutral and safe without a required image", () => {
  const article = NEWS_ARTICLES[0];
  const text = JSON.stringify(article);

  assert.equal(article.image, undefined);
  assert.match(text, /três unidades em Sabará/i);
  assert.doesNotMatch(text, /R\$|desconto|promoção|cura|tratamento|diagnóstico/i);
  assert.equal(getRelatedNews(article).length, 0);
  assert.match(formatNewsDate(article.publishedAt), /16 de agosto de 2026/);
});

test("blog: categorias só aparecem com texto publicado e aprovado, na ordem do menu", async () => {
  const { categorySlug, groupNewsByCategory, NEWS_CATEGORIES } = await import("../app/news-content.ts");
  assert.equal(categorySlug("Saúde Mental"), "saude-mental");
  assert.equal(categorySlug("Atividade Física"), "atividade-fisica");
  const base = { excerpt: "x", publishedAt: "2026-11-01", content: [], seo: { title: "t", description: "d" } };
  const lista = [
    { ...base, slug: "a", title: "A", category: "Beleza", publicationStatus: "published", contentApproved: true },
    { ...base, slug: "b", title: "B", category: "Saúde", publicationStatus: "published", contentApproved: true },
  ];
  assert.deepEqual(groupNewsByCategory(lista).map((g) => g.nome), ["Saúde", "Beleza"], "segue a ordem de NEWS_CATEGORIES");
  assert.deepEqual(groupNewsByCategory([]), []);
  assert.ok(NEWS_CATEGORIES.includes("União Farma"));
  // O que a página usa por padrão só traz o que passou pela trava de aprovação.
  for (const g of groupNewsByCategory()) for (const a of g.artigos) assert.equal(a.contentApproved && a.publicationStatus === "published", true);
});
