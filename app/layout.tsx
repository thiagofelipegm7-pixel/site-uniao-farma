import type { Metadata, Viewport } from "next";
import { Fraunces, Poppins } from "next/font/google";
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
import "./motion.css";
import "./refero.css";
import "./kerning.css";
import "./type-mobile.css";
import "./type-format.css";
import "./skin.css";
import "./contrast.css";
import "./pending.css";
import "./logo-fix.css";
import "./reviews-section.css";
import "./mobile-quick-nav.css";
import "./aqua-override.css";
import "./units-showcase.css";
import "./store-presence.css";
import "./home-reasons.css";
import { INSTAGRAM_URL, SITE_URL, UNITS } from "./site-config";

const AnalyticsConsent = dynamic(() => import("./AnalyticsConsent"), { ssr: false });
const PwaRegister = dynamic(() => import("./PwaRegister"), { ssr: false });

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "800"],
  display: "swap",
  preload: false,
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: true,
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  preload: true,
  variable: "--font-display",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: true,
});

const SITE_DESCRIPTION =
  "Farm\u00e1cia e drogaria em Sabar\u00e1 com tr\u00eas unidades: F\u00e1tima, Na\u00e7\u00f5es Unidas e Itacolomi. Medicamentos, perfumaria e pedido pelo WhatsApp.";

const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  "chgP6OWdJAiM-yv_oPbit7Rf91vAsI7xDUWEuNQG1xk";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Farm\u00e1cia em Sabar\u00e1 | Uni\u00e3o Farma",
    template: "%s | Uni\u00e3o Farma",
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Uni\u00e3o Farma",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
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
    title: "Farm\u00e1cia em Sabar\u00e1 | Uni\u00e3o Farma",
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Uni\u00e3o Farma",
    images: [
      {
        url: "/og-instagram.png",
        width: 1792,
        height: 909,
        alt: "Uni\u00e3o Farma \u2014 cuidado e ofertas pertinho de voc\u00ea em tr\u00eas unidades de Sabar\u00e1",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Farm\u00e1cia em Sabar\u00e1 | Uni\u00e3o Farma",
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
  themeColor: "#0e7370",
  colorScheme: "light",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Uni\u00e3o Farma",
  alternateName: "Drogaria e Perfumaria Uni\u00e3o Farma",
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
  name: "Uni\u00e3o Farma",
  description: SITE_DESCRIPTION,
  inLanguage: "pt-BR",
  publisher: {
    "@id": `${SITE_URL}/#organization`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="light" className={`${poppins.className} ${fraunces.variable}`}>
      <head>
        <link rel="preload" href="/illustrations/atendimento.svg?v=8" as="image" type="image/svg+xml" fetchPriority="high" />
      </head>
      <body>
        <a className="skip-link" href="#conteudo">
          Ir para o conte\u00fado
        </a>
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
