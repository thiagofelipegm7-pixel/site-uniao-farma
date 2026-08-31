import { SITE_URL, type Unit } from "./site-config";
import type { FaqItem } from "./seo-content";

const weekdayNames = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
} as const;

export function getOpeningHoursSpecification(unit: Unit) {
  return (Object.keys(weekdayNames) as Array<keyof typeof weekdayNames>)
    .map((day) => {
      const hours = unit.schedule[day];
      if (!hours) return null;

      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: weekdayNames[day],
        opens: hours.open,
        closes: hours.close,
      };
    })
    .filter(Boolean);
}

export function getUnitBusinessSchema(unit: Unit) {
  const url = `${SITE_URL}/unidades/${unit.slug}`;

  return {
    "@type": ["LocalBusiness", "Pharmacy"],
    "@id": `${url}#localbusiness`,
    name: unit.title,
    description: `Farmácia e drogaria da União Farma no bairro ${unit.neighborhood}, em Sabará/MG.`,
    url,
    telephone: `+${unit.phoneLink.replace("tel:+", "")}`,
    image: `${SITE_URL}/uniao-farma-logo.webp`,
    address: {
      "@type": "PostalAddress",
      streetAddress: unit.address.split(" — ")[0],
      addressLocality: "Sabará",
      addressRegion: "MG",
      addressCountry: "BR",
    },
    ...(unit.coordinates
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: unit.coordinates.latitude,
            longitude: unit.coordinates.longitude,
          },
        }
      : {}),
    hasMap: unit.map,
    openingHoursSpecification: getOpeningHoursSpecification(unit),
    areaServed: {
      "@type": "City",
      name: "Sabará",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${unit.whatsappDigits}`,
      contactType: "customer service",
      availableLanguage: "Portuguese",
    },
    parentOrganization: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function getFaqSchema(faqs: FaqItem[], url: string) {
  return {
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function getPageStructuredData(options: {
  name: string;
  url: string;
  faqs?: FaqItem[];
  breadcrumbs: Array<{ name: string; url: string }>;
  unit?: Unit;
}) {
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "WebPage",
      "@id": `${options.url}#webpage`,
      url: options.url,
      name: options.name,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      inLanguage: "pt-BR",
    },
    getBreadcrumbSchema(options.breadcrumbs),
  ];

  if (options.unit) graph.push(getUnitBusinessSchema(options.unit));
  if (options.faqs?.length) graph.push(getFaqSchema(options.faqs, options.url));

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
