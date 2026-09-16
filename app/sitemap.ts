import type { MetadataRoute } from "next";
import { getPublishedNews } from "./news-content";
import { SITE_URL, UNITS } from "./site-config";
import { PAGE_LAST_UPDATED, sitemapDate } from "./sitemap-dates";
import { getUnitPublicPath } from "./structured-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const news = getPublishedNews();
  const latestNews = news.reduce<string>((latest, article) => {
    return article.publishedAt > latest ? article.publishedAt : latest;
  }, PAGE_LAST_UPDATED.novidades);

  const unitDates: Record<(typeof UNITS)[number]["id"], string> = {
    fatima: PAGE_LAST_UPDATED.fatima,
    nacoes: PAGE_LAST_UPDATED.nacoes,
    itacolomi: PAGE_LAST_UPDATED.itacolomi,
  };

  return [
    {
      url: SITE_URL,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.home),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...UNITS.map((unit) => ({
      url: `${SITE_URL}${getUnitPublicPath(unit)}`,
      lastModified: sitemapDate(unitDates[unit.id]),
      changeFrequency: "weekly" as const,
      priority: 0.95,
    })),
    {
      url: `${SITE_URL}/ofertas`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.ofertas),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/receita`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.receita),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/novidades`,
      lastModified: sitemapDate(latestNews),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/perguntas`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.perguntas),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/institucional`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.institucional),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/farmacia-em-sabara`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.farmaciaEmSabara),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/entrega-de-medicamentos-em-sabara`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.entrega),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: `${SITE_URL}/perfumaria-em-sabara`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.perfumaria),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...news.map((article) => ({
      url: `${SITE_URL}/novidades/${article.slug}`,
      lastModified: new Date(`${article.publishedAt}T12:00:00-03:00`),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.privacidade),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified: sitemapDate(PAGE_LAST_UPDATED.termos),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
