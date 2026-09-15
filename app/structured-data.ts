import { COMPANY } from "./company";
import { INSTAGRAM_URL, SITE_URL, type Unit } from "./site-config";
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

const PUBLIC_PATH: Record<Unit["id"], string> = {
  fatima: "/fatima",
  nacoes: "/nacoes-unidas",
  itacolomi: "/itacolomi",
};

export function getUnitPublicPath(unit: Unit) {
  return PUBLIC_PATH[unit.id];
}

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

export function getUnitBusinessSchema(unit: Unit, pageUrl = `${SITE_URL}${PUBLIC_PATH[unit.id]}`) {
  return {
    "@type": ["Pharmacy", "LocalBusiness"],
    "@id": `${pageUrl}#localbusiness`,
    name: `União Farma ${unit.shortName}`,
    alternateName: COMPANY.legalName,
    description: `Farmácia e drogaria da União Farma no bairro ${unit.neighborhood}, em Sabará/MG. Medicamentos, perfumaria e pedido pelo WhatsApp.`,
    url: pageUrl,
    telephone: `+${unit.phoneLink.replace("tel:+", "")}`,
    image: `${SITE_URL}/uniao-farma-logo.webp`,
    taxID: COMPANY.cnpj,
    address: {
      "@type": "PostalAddress",
      streetAddress: unit.address.split(" — ")[0],
      addressLocality: "Sabará",
      addressRegion: "MG",
      addressCountry: "BR",
      addressNeighborhood: unit.neighborhood,
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
    areaServed: `Entrega sob consulta no bairro ${unit.neighborhood} e em Sabará. A loja confirma se atende o endereço.`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${unit.whatsappDigits}`,
      contactType: "customer service",
      availableLanguage: "Portuguese",
      areaServed: "Sabará",
    },
    sameAs: [INSTAGRAM_URL, unit.map],
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
  units?: Unit[];
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

  if (options.unit) graph.push(getUnitBusinessSchema(options.unit, options.url));
  if (options.units?.length) {
    for (const unit of options.units) {
      graph.push(getUnitBusinessSchema(unit));
    }
  }
  if (options.faqs?.length) graph.push(getFaqSchema(options.faqs, options.url));

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
