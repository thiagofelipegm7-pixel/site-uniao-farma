/* eslint-disable @next/next/no-html-link-for-pages */
import { INSTAGRAM_URL, UNITS, buildWhatsAppUrl } from "./site-config";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/#unidades-rapidas", label: "Unidades" },
  { href: "/receita", label: "Receita" },
  { href: "/novidades", label: "Novidades" },
  { href: "/privacidade", label: "Privacidade" },
];

const defaultMessage =
  "Olá, União Farma {unidade}! Quero pedir um produto. Nome: ___  dosagem: ___  bairro: ___";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.8" r="2.3" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M12.04 2.02C6.55 2.02 2.1 6.47 2.1 11.96c0 1.75.46 3.45 1.33 4.95L2 22l5.23-1.37a9.9 9.9 0 0 0 4.81 1.23h.01c5.49 0 9.94-4.45 9.94-9.94 0-2.65-1.03-5.15-2.91-7.03A9.9 9.9 0 0 0 12.04 2.02Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1.81.83-3.02-.2-.31a8.2 8.2 0 0 1-1.26-4.34c0-4.53 3.69-8.22 8.22-8.22 2.2 0 4.26.86 5.81 2.41a8.17 8.17 0 0 1 2.41 5.81c0 4.53-3.69 8.22-8.22 8.22Zm4.51-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.96-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.85-.2-.48-.4-.42-.56-.42h-.48c-.16 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.24 3.74.59.26 1.06.41 1.42.52.6.19 1.14.16 1.57.1.48-.07 1.46-.6 1.67-1.17.21-.58.21-1.07.14-1.17-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

export default function SiteFooter() {
  return (
    <footer className="uf-footer">
      <div className="uf-footer-inner">
        <div className="uf-footer-grid">
          <div className="uf-footer-brand">
            <a className="uf-footer-logo" href="/">
              <img src="/uniao-farma-logo.webp" alt="Logo da União Farma" width="52" height="52" />
              <span>
                <strong>União Farma</strong>
                <small>Drogaria e Perfumaria</small>
              </span>
            </a>
            <p>
              Cuidado próximo para toda a família. Medicamentos, higiene, beleza e bem-estar em
              três unidades de Sabará/MG, com pedido pelo WhatsApp.
            </p>
            <div className="uf-footer-social">
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram da União Farma" title="Instagram">
                <InstagramIcon />
              </a>
              <a href="/#unidades-rapidas" aria-label="Ver unidades" title="Unidades">
                <PinIcon />
              </a>
              <a href="/#unidades-rapidas" aria-label="Escolher unidade no WhatsApp" title="Escolher unidade no WhatsApp">
                <WhatsAppIcon />
              </a>
            </div>
          </div>

          <nav className="uf-footer-col" aria-label="Navegação do rodapé">
            <h2>Navegação</h2>
            {NAV.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="uf-footer-col">
            <h2>Contato</h2>
            {UNITS.map((unit) => (
              <a
                key={unit.id}
                href={buildWhatsAppUrl(unit, defaultMessage.replaceAll("{unidade}", unit.shortName), {
                  campaign: "footer",
                  content: `footer_${unit.id}`,
                })}
                target="_blank"
                rel="noreferrer"
              >
                {unit.shortName}: {unit.whatsapp}
              </a>
            ))}
            <a href={UNITS[0].phoneLink}>Fixo Fátima: {UNITS[0].phone}</a>
          </div>

          <div className="uf-footer-col">
            <h2>Empresa</h2>
            <p className="uf-footer-legal-name">Drogaria e Perfumaria União Farma</p>
            {UNITS.map((unit) => (
              <p key={unit.id}>{unit.shortAddress}</p>
            ))}
            <p>Sabará/MG</p>
          </div>
        </div>

        <div className="uf-footer-bottom">
          <p>© {new Date().getFullYear()} União Farma. Todos os direitos reservados.</p>
          <p>Farmacêutico(a) Responsável Técnico presente durante o horário de funcionamento.</p>
          <p>
            <a href="/privacidade">Privacidade</a>
            <span aria-hidden="true"> · </span>
            <a href="/termos">Termos</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
