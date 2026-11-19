import { COMPANY } from "./company";
import { getDayRule, getSaoPauloDateKey, SPECIAL_DATES, UNIT_DAY_OVERRIDES } from "./hours-exceptions";
import { INSTAGRAM_URL, PAYMENT_ACCEPTED, SITE_URL, type Unit } from "./site-config";
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

/**
 * Horários especiais confirmados pelo dono (Finados, vésperas), a partir de hours-exceptions.
 * Só entram as datas com horário definido. Feriado sem regra própria fica de fora: o site manda
 * confirmar no WhatsApp, então o schema não afirma que a loja está fechada.
 * Datas já passadas saem da lista (fromDateKey = hoje em São Paulo, formato YYYY-MM-DD).
 */
export function getSpecialOpeningHoursSpecification(unit: Unit, fromDateKey = getSaoPauloDateKey(new Date())) {
  const dateKeys = new Set([...Object.keys(SPECIAL_DATES), ...Object.keys(UNIT_DAY_OVERRIDES[unit.id] ?? {})]);
  return [...dateKeys]
    .filter((dateKey) => dateKey >= fromDateKey)
    .sort()
    .flatMap((dateKey) => {
      const rule = getDayRule(dateKey, unit.id);
      if (!rule || rule.type !== "special") return [];
      return [
        {
          "@type": "OpeningHoursSpecification",
          validFrom: dateKey,
          validThrough: dateKey,
          opens: rule.open,
          closes: rule.close,
        },
      ];
    });
}

export function getPostalAddress(unit: Unit) {
  return {
    "@type": "PostalAddress",
    // schema.org não tem campo de bairro em PostalAddress: o bairro vai junto do logradouro.
    streetAddress: `${unit.street} - ${unit.neighborhood}`,
    addressLocality: "Sabará",
    addressRegion: "MG",
    addressCountry: "BR",
    postalCode: unit.cep,
  };
}

export function getUnitBusinessSchema(unit: Unit, pageUrl = `${SITE_URL}${PUBLIC_PATH[unit.id]}`) {
  const specialHours = getSpecialOpeningHoursSpecification(unit);
  return {
    "@type": ["Pharmacy", "LocalBusiness"],
    "@id": `${pageUrl}#localbusiness`,
    name: `União Farma ${unit.shortName}`,
    alternateName: [COMPANY.legalName, ...(unit.alternateNames ?? [])],
    description: `Farmácia e drogaria da União Farma no bairro ${unit.neighborhood}, em Sabará/MG. Medicamentos, perfumaria e pedido pelo WhatsApp.`,
    url: pageUrl,
    telephone: `+${unit.phoneLink.replace("tel:+", "")}`,
    image: `${SITE_URL}/uniao-farma-logo.webp`,
    taxID: COMPANY.cnpj,
    priceRange: "$$",
    address: getPostalAddress(unit),
    ...(unit.coordinates
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: unit.coordinates.latitude,
            longitude: unit.coordinates.longitude,
          },
        }
      : {}),
    ...(unit.amenities?.freeParking
      ? {
          amenityFeature: [
            { "@type": "LocationFeatureSpecification", name: "Estacionamento gratuito", value: true },
          ],
        }
      : {}),
    paymentAccepted: PAYMENT_ACCEPTED,
    hasMap: unit.map,
    openingHoursSpecification: getOpeningHoursSpecification(unit),
    ...(specialHours.length ? { specialOpeningHoursSpecification: specialHours } : {}),
    areaServed: unit.deliveryAreas.map((name) => ({
      "@type": "Place",
      name: `${name}, Sabará - MG`,
    })),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+${unit.whatsappDigits}`,
      contactType: "customer service",
      name: "WhatsApp",
      availableLanguage: "Portuguese",
      areaServed: "Sabará",
    },
    sameAs: [INSTAGRAM_URL, unit.map, ...(unit.ifoodUrl ? [unit.ifoodUrl] : [])],
    ...(unit.ifoodUrl
      ? {
          potentialAction: {
            "@type": "OrderAction",
            name: `Pedir no iFood: União Farma ${unit.shortName}`,
            target: {
              "@type": "EntryPoint",
              urlTemplate: unit.ifoodUrl,
              actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"],
            },
          },
        }
      : {}),
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
