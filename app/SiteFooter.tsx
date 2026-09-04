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

export default function SiteFooter() {
  const primaryUnit = UNITS[0];

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
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram da União Farma">
                IG
              </a>
              <a href="/#unidades-rapidas" aria-label="Ver unidades">
                Unidades
              </a>
              <a
                href={buildWhatsAppUrl(primaryUnit, defaultMessage.replaceAll("{unidade}", primaryUnit.shortName), {
                  campaign: "footer",
                  content: "footer_whatsapp",
                })}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
              >
                WA
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
