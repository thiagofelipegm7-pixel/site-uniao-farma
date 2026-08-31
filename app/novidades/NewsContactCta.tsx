import { buildWhatsAppUrl, UNITS } from "../site-config";

export default function NewsContactCta({ articleTitle, label }: { articleTitle: string; label: string }) {
  return (
    <section className="news-contact" aria-labelledby="news-contact-title">
      <div>
        <p className="section-kicker light">Atendimento direto</p>
        <h2 id="news-contact-title">{label}</h2>
        <p>Escolha a unidade mais conveniente. A equipe confirma as informações durante o atendimento.</p>
      </div>
      <div className="news-contact-units">
        {UNITS.map((unit) => {
          const message = `Olá! Li uma novidade no site da União Farma e gostaria de falar com a unidade ${unit.shortName}. Publicação: ${articleTitle}.`;
          return (
            <a
              key={unit.id}
              href={buildWhatsAppUrl(unit, message, {
                campaign: "novidades",
                content: `article_${unit.id}`,
              })}
              target="_blank"
              rel="noreferrer"
              data-track-event="whatsapp_click"
              data-track-unit={unit.id}
              data-track-source="news_article"
              data-track-placement="article_cta"
            >
              <strong>{unit.shortName}</strong>
              <span>Consultar pelo WhatsApp</span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
