export type NewsContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "links"; items: Array<{ label: string; href: string }> };

export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  publicationStatus: "draft" | "published";
  contentApproved: boolean;
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  content: NewsContentBlock[];
  cta?: {
    label: string;
    mode: "unit_contact" | "link";
    href?: string;
  };
  relatedSlugs?: string[];
  seo: {
    title: string;
    description: string;
  };
};

export type NewsVisual = {
  src: string;
  alt: string;
  title: string;
  caption: string;
};

export const NEWS_VISUALS: NewsVisual[] = [
  {
    src: "/novidades/cognon-fos-novidade.jpg",
    alt: "Arte de novidade sobre Cognon FOS, suplemento alimentar em comprimidos",
    title: "Novidade Cognon FOS",
    caption: "Consulte uma unidade da União Farma para informações sobre disponibilidade.",
  },
  {
    src: "/novidades/gripe-e-cuidados.jpg",
    alt: "Arte com orientações gerais sobre gripe e opções para adultos e crianças",
    title: "Cuidados na temporada de gripe",
    caption: "Consulte a equipe sobre disponibilidade de produtos. Em caso de sintomas ou dúvidas de saúde, procure orientação de profissional habilitado.",
  },
  {
    src: "/novidades/melatonina-dr-good-fini.jpg",
    alt: "Arte de novidade sobre melatonina Dr. Good com sabor de morango",
    title: "Novidade Dr. Good + Fini",
    caption: "Consulte uma unidade da União Farma para informações sobre disponibilidade.",
  },
];

export const NEWS_ARTICLES: NewsArticle[] = [
  {
    slug: "bem-vindo-area-novidades",
    title: "Bem-vindo à área de novidades da União Farma",
    excerpt: "Este espaço reúne informações e novidades da União Farma em Sabará.",
    category: "União Farma",
    publishedAt: "2026-08-16",
    publicationStatus: "published",
    contentApproved: true,
    content: [
      {
        type: "paragraph",
        text: "A União Farma reúne três unidades em Sabará. Esta área foi criada para organizar informações institucionais e conteúdos úteis em um só lugar.",
      },
      {
        type: "heading",
        level: 2,
        text: "O que você encontrará por aqui",
      },
      {
        type: "paragraph",
        text: "As próximas publicações poderão apresentar novidades das unidades, informações gerais e campanhas que tenham sido revisadas e aprovadas antes da publicação.",
      },
      {
        type: "links",
        items: [
          { label: "Conheça as unidades da União Farma", href: "/#unidades-rapidas" },
          { label: "Veja a área de ofertas", href: "/ofertas" },
          { label: "Saiba mais sobre perfumaria em Sabará", href: "/perfumaria-em-sabara" },
        ],
      },
      {
        type: "heading",
        level: 2,
        text: "Fale com a unidade mais conveniente",
      },
      {
        type: "paragraph",
        text: "Para confirmar condições de atendimento, entrega sob consulta ou outras informações, escolha uma das unidades e fale diretamente com a equipe.",
      },
    ],
    cta: {
      label: "Falar com uma unidade",
      mode: "unit_contact",
    },
    seo: {
      title: "Bem-vindo à área de novidades da União Farma",
      description: "Conheça a nova área de novidades e informações da União Farma em Sabará.",
    },
  },
];

export function getPublishedNews(): NewsArticle[] {
  return NEWS_ARTICLES.filter(
    (article) => article.publicationStatus === "published" && article.contentApproved,
  ).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getNewsArticle(slug: string): NewsArticle | undefined {
  return getPublishedNews().find((article) => article.slug === slug);
}

export function getRelatedNews(article: NewsArticle): NewsArticle[] {
  const published = getPublishedNews().filter((item) => item.slug !== article.slug);
  if (!article.relatedSlugs?.length) return published.slice(0, 3);
  return article.relatedSlugs
    .map((slug) => published.find((item) => item.slug === slug))
    .filter((item): item is NewsArticle => Boolean(item));
}

export function formatNewsDate(value: string): string {
  const date = new Date(`${value}T12:00:00-03:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
