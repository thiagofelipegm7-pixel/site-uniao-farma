import type { Metadata, Viewport } from "next";
import AnalyticsConsent from "./AnalyticsConsent";
import MobileQuickNav from "./MobileQuickNav";
import OpenNowStrip from "./OpenNowStrip";
import PreferredStoreBanner from "./PreferredStoreBanner";
import PwaRegister from "./PwaRegister";
import SiteFooter from "./SiteFooter";
import "./globals.css";
import "./mobile-fixes.css";
import "./neighborhood.css";
import "./site-footer.css";
import "./nearest-unit.css";
import { INSTAGRAM_URL, SITE_URL, UNITS } from "./site-config";

const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  "chgP6OWdJAiM-yv_oPbit7Rf91vAsI7xDUWEuNQG1xk";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Farmácia em Sabará | União Farma",
    template: "%s | União Farma",
  },
  description:
    "Farmácia e drogaria em Sabará com medicamentos, perfumaria e entrega sob consulta. Fale pelo WhatsApp com uma das três unidades.",
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Farmácia em Sabará | União Farma",
    description:
      "Drogaria em Sabará com três unidades, perfumaria e consulta de entrega pelo WhatsApp.",
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "União Farma",
    images: [
      {
        url: "/og-instagram.png",
        width: 1792,
        height: 909,
        alt: "União Farma — cuidado e ofertas pertinho de você em três unidades de Sabará",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farmácia em Sabará | União Farma",
    description:
      "Consulte preço, disponibilidade e entrega com a unidade da União Farma mais próxima.",
    images: ["/og-instagram.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? { verification: { google: GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#176f62",
  colorScheme: "light",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "União Farma",
  alternateName: "Drogaria e Perfumaria União Farma",
  url: SITE_URL,
  logo: `${SITE_URL}/uniao-farma-logo.webp`,
  sameAs: [INSTAGRAM_URL],
  contactPoint: UNITS.map((unit) => ({
    "@type": "ContactPoint",
    telephone: `+${unit.whatsappDigits}`,
    contactType: "customer service",
    availableLanguage: ["Portuguese"],
    areaServed: "BR",
  })),
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "União Farma",
  description: "Drogaria e Perfumaria em Sabará — atendimento em três unidades.",
  inLanguage: "pt-BR",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light">
      <body>
        <AnalyticsConsent />
        <PwaRegister />
        <OpenNowStrip />
        <PreferredStoreBanner />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, websiteSchema]),
          }}
        />
        {children}
        <MobileQuickNav />
        <SiteFooter />
      </body>
    </html>
  );
}
