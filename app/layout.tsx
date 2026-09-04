import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import dynamic from "next/dynamic";
import MobileQuickNav from "./MobileQuickNav";
import OpenNowStrip from "./OpenNowStrip";
import PreferredStoreBanner from "./PreferredStoreBanner";
import SiteFooter from "./SiteFooter";
import "./tokens.css";
import "./globals.css";
import "./mobile-fixes.css";
import "./neighborhood.css";
import "./site-footer.css";
import "./nearest-unit.css";
import "./visual-polish.css";
import "./lcp.css";
import "./inp.css";
import "./visual-detail.css";
import "./type.css";
import "./viewport.css";
import { INSTAGRAM_URL, SITE_URL, UNITS } from "./site-config";

const AnalyticsConsent = dynamic(() => import("./AnalyticsConsent"), { ssr: false });
const PwaRegister = dynamic(() => import("./PwaRegister"), { ssr: false });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
  preload: true,
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
    template: "%s | União Farma",
  },
  description: SITE_DESCRIPTION,
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
    description: SITE_DESCRIPTION,
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
    description: SITE_DESCRIPTION,
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
  logo: `${SITE_URL}/icon-192.png`,
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
  description: SITE_DESCRIPTION,
  inLanguage: "pt-BR",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light" className={poppins.className}>
      <head>
        <link rel="preload" href="/icon-192.png" as="image" type="image/png" fetchPriority="high" />
      </head>
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
        <main id="conteudo">{children}</main>
        <MobileQuickNav />
        <SiteFooter />
      </body>
    </html>
  );
}
