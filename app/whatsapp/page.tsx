"use client";

import { trackEvent } from "../analytics";
import { buildWhatsAppUrl, UNITS } from "../site-config";
import { WhatsAppIcon } from "../home-chrome";

const MESSAGE =
  "Oi, União Farma {unidade}! Vim pelo anúncio e quero consultar um produto. Posso mandar o nome?";

export default function WhatsAppAdsPage() {
  return (
    <>
      <header className="site-header">
        <nav className="nav" aria-label="Menu">
          <a className="brand" href="/">
            <img src="/icon-192.png" alt="Logo da União Farma" width="52" height="52" decoding="async" />
            <span>
              <strong>União Farma</strong>
              <small>Drogaria e Perfumaria</small>
            </span>
          </a>
        </nav>
      </header>
      <section className="hero reveal is-visible" id="inicio">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Três farmácias em Sabará</p>
            <h1>Cuidado, ofertas e entrega pertinho de você.</h1>
            <p className="hero-lead">Toque na loja do seu bairro. O WhatsApp abre na hora, com a conversa pronta.</p>
          </div>
          <div className="hero-whatsapp" id="whatsapp-lojas">
            <p className="hero-whatsapp-label">Falar com a loja agora</p>
            <div className="hero-whatsapp-row">
              {UNITS.map((unit) => (
                <a
                  key={unit.id}
                  className="hero-whatsapp-btn"
                  href={buildWhatsAppUrl(unit, MESSAGE.replaceAll("{unidade}", unit.shortName), {
                    campaign: "google_ads",
                    content: `ads_whatsapp_${unit.id}`,
                  })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackEvent("whatsapp_click", {
                      unit: unit.id,
                      source: "google_ads_landing",
                      placement: "ads_whatsapp_page",
                    })
                  }
                >
                  <WhatsAppIcon />
                  <span>{unit.shortName}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
