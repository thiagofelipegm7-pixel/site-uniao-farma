import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import PublicOffersGrid from "../PublicOffersGrid";
import { INSTAGRAM_URL, SITE_URL, UNITS, buildWhatsAppUrl } from "../site-config";
import { WHATSAPP_MESSAGES } from "../whatsapp-messages";

export const metadata: Metadata = {
  title: { absolute: "Encarte da semana | União Farma Sabará" },
  description: "Ofertas da semana da União Farma. Escolha a loja e peça no WhatsApp.",
  alternates: { canonical: `${SITE_URL}/encarte` },
};

export default function FlyerPage() {
  return (
    <>
      <ContentSiteHeader activePath="/ofertas" />
      <main className="encarte-page">
        <section className="section-inner">
          <p className="eyebrow">Encarte da semana</p>
          <h1>Ofertas no Instagram e no site, no mesmo dia</h1>
          <p>Quem vê o post cai na loja certa. Sem telefone único.</p>
          <div className="encarte-unit-row">
            {UNITS.map((unit) => (
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
          <p>
            Link do Instagram: <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">@droguniaofarma</a>
            {" · "}use <strong>{SITE_URL}/encarte</strong> na bio e nos stories.
          </p>
        </section>
        <section className="section-inner" style={{ marginTop: 24 }}>
          <PublicOffersGrid />
        </section>
      </main>
      <ContentSiteFooter />
    </>
  );
}
