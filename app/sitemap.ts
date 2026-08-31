import type { MetadataRoute } from "next";
import { getPublishedNews } from "./news-content";
import { SITE_URL, UNITS } from "./site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...UNITS.map((unit) => ({
      url: `${SITE_URL}/unidades/${unit.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    {
      url: `${SITE_URL}/farmacia-em-sabara`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/entrega-de-medicamentos-em-sabara`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/perfumaria-em-sabara`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ofertas`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/novidades`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getPublishedNews().map((article) => ({
      url: `${SITE_URL}/novidades/${article.slug}`,
      lastModified: new Date(`${article.publishedAt}T12:00:00-03:00`),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
