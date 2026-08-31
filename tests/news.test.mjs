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
