import type { Metadata } from "next";
import OffersGroupCta from "../OffersGroupCta";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import PublicOffersGrid from "../PublicOffersGrid";
import { INSTAGRAM_URL, SITE_URL, PUBLIC_UNITS, buildWhatsAppUrl } from "../site-config";
import { getPageStructuredData } from "../structured-data";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";

const TITLE = "Encarte da semana | União Farma Sabará";
const DESCRIPTION = "Ofertas da semana da União Farma. Escolha a loja e peça no WhatsApp.";
const PAGE_URL = `${SITE_URL}/encarte`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/encarte" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/ofertas-og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/ofertas-og-optimized.jpg"] },
};

const structuredData = getPageStructuredData({
  name: TITLE,
  url: PAGE_URL,
  breadcrumbs: [
    { name: "Início", url: `${SITE_URL}/` },
    { name: "Ofertas", url: `${SITE_URL}/ofertas` },
    { name: "Encarte da semana", url: PAGE_URL },
  ],
});

export default function FlyerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ContentSiteHeader activePath="/ofertas" />
      <div className="encarte-page">
        <section className="section-inner">
          <p className="eyebrow">Encarte da semana</p>
          <h1>Ofertas no Instagram e no site, no mesmo dia</h1>
          <p>Quem vê o post cai na loja certa. Sem telefone único.</p>
          <div className="encarte-unit-row">
            {PUBLIC_UNITS.map((unit) => (
              <a
                key={unit.id}
                className="button button-whatsapp"
                href={buildWhatsAppUrl(unit, WHATSAPP_MESSAGES.product.replaceAll("{unidade}", unit.shortName), {
                  campaign: "instagram_encarte",
                  content: unit.id,
                })}
                target="_blank"
                rel="noreferrer"
              >
                Pedir em {unit.id === "fatima" ? "Fátima" : unit.id === "nacoes" ? "Nações" : "Itacolomi"}
              </a>
            ))}
          </div>
          <p className="offers-group-inline">
            <OffersGroupCta placement="encarte" />
          </p>
          <p>
            <a className="button button-call" href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              Ver no Instagram
            </a>
          </p>
        </section>
        <section className="section-inner" style={{ marginTop: 24 }}>
          <PublicOffersGrid />
        </section>
      </div>
      <ContentSiteFooter />
    </>
  );
}
