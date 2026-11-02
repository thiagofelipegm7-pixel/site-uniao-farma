import type { Metadata, Viewport } from "next";
import { Montserrat, Poppins } from "next/font/google";
import MobileQuickNav from "./MobileQuickNav";
import SiteFooter from "./SiteFooter";
import SkipLink from "./SkipLink";
import WhatsAppFab from "./WhatsAppFab";

// Sistema de Design Consolidado (Camadas Tailwind 4)
import "./tokens.css";
import "./globals.css";
import "./typography.css";
import "./layout-system.css";
import "./components.css";
import "./theme.css";
import "./overrides.css";
import "./design.css";
import { INSTAGRAM_URL, PAYMENT_ACCEPTED, SITE_URL, UNITS } from "./site-config";
import { COMPANY } from "./company";
import { getPostalAddress } from "./structured-data";

import { GA_MEASUREMENT_ID, getGtagBootstrapScript } from "./ga-bootstrap";
// Importado direto (componente "use client"): com dynamic({ssr:false}) o vinext não montava o banner,
// ninguém conseguia aceitar os cookies e o GA4 só recebia pings sem consentimento.
import AnalyticsConsent from "./AnalyticsConsent";
import PwaRegister from "./PwaRegister";
import OfferAlerts from "./OfferAlerts";

const poppins = Poppins({
  subsets: ["latin"],
  // Títulos, preço e selos (DESIGN.md §2.2): só os pesos usados.
  weight: ["600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-brand",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: true,
});

const montserrat = Montserrat({
  subsets: ["latin"],
  // Corpo (400), rótulos e botões (600), sobretítulos (700). Antes 500/600: o
  // corpo em 400 e os sobretítulos em 700 saíam com peso sintetizado pelo navegador.
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
  variable: "--font-support",
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: true,
});

const SITE_DESCRIPTION =
  "Farmácia e drogaria em Sabará com três unidades: Fátima, Nações Unidas e Itacolomi. Medicamentos, perfumaria e pedido pelo WhatsApp.";

const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  "chgP6OWdJAiM-yv_oPbit7Rf91vAsI7xDUWEuNQG1xk";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Farmácia em Sabará | União Farma",
    template: "%s",
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "União Farma",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "pt_BR",
    url: `${SITE_URL}/`,
    siteName: "União Farma",
    images: [
      {
        url: "/og-instagram-optimized.jpg",
        width: 1200,
        height: 609,
        alt: "União Farma — cuidado e ofertas pertinho de você em três unidades de Sabará",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farmácia em Sabará | União Farma",
    description: SITE_DESCRIPTION,
    images: ["/og-instagram-optimized.jpg"],
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
  themeColor: "#0e7370",
  colorScheme: "light",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "União Farma",
  alternateName: COMPANY.legalName,
  taxID: COMPANY.cnpj,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/icon-192.png`,
  sameAs: [INSTAGRAM_URL, ...UNITS.map((unit) => unit.map)],
  address: UNITS.map((unit) => getPostalAddress(unit)),
  location: UNITS.map((unit) => ({
    "@type": "Place",
    name: `União Farma ${unit.shortName}`,
    address: getPostalAddress(unit),
  })),
  paymentAccepted: PAYMENT_ACCEPTED,
  contactPoint: UNITS.map((unit) => ({
    "@type": "ContactPoint",
    telephone: `+${unit.whatsappDigits}`,
    contactType: "customer service",
    availableLanguage: ["Portuguese"],
    areaServed: "Sabará",
  })),
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "União Farma",
  description: SITE_DESCRIPTION,
  inLanguage: "pt-BR",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light" className={`${poppins.className} ${poppins.variable} ${montserrat.variable}`}>
      <head>
        <link
          rel="preload"
          href="/uniao-farma-perfumaria-480.webp?v=27"
          as="image"
          type="image/webp"
          imageSrcSet="/uniao-farma-perfumaria-360.webp?v=27 360w, /uniao-farma-perfumaria-480.webp?v=27 480w"
          imageSizes="(max-width: 720px) 88vw, 360px"
          fetchPriority="high"
        />
        <script dangerouslySetInnerHTML={{ __html: getGtagBootstrapScript() }} />
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//connect.facebook.net" />
      </head>
      <body>
        <SkipLink />
        <AnalyticsConsent />
        <PwaRegister />
        <OfferAlerts />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationSchema, websiteSchema]),
          }}
        />
        <main id="conteudo" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
        <MobileQuickNav />
        <WhatsAppFab />
      </body>
    </html>
  );
}
