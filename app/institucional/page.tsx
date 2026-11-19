import type { Metadata } from "next";
import { COMPANY, UNIT_LEGAL } from "../company";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { SITE_URL } from "../site-config";
import { getPageStructuredData } from "../structured-data";

const TITLE = "Dados institucionais | União Farma Sabará";
const DESCRIPTION = "Razão social, CNPJ, endereços das três lojas em Sabará e avisos sanitários da União Farma.";
const PAGE_URL = `${SITE_URL}/institucional`;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/institucional" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "website", images: ["/og-optimized.jpg"] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-optimized.jpg"] },
};

const structuredData = getPageStructuredData({
  name: TITLE,
  url: PAGE_URL,
  breadcrumbs: [
    { name: "Início", url: `${SITE_URL}/` },
    { name: "Dados institucionais", url: PAGE_URL },
  ],
});

export default function InstitutionalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ContentSiteHeader activePath="/ofertas" />
      <div className="legal-page institucional-page">
        <div className="legal-container">
          <p className="eyebrow">Identificação da empresa</p>
          <h1>Dados institucionais</h1>
          <p>
            {COMPANY.legalName}. CNPJ {COMPANY.cnpj}. Matriz em {COMPANY.city}/{COMPANY.state}.
          </p>
          <p>{COMPANY.pharmacistNote}</p>

          <section>
            <h2>Unidades</h2>
            {Object.values(UNIT_LEGAL).map((unit) => (
              <article key={unit.label}>
                <h3>{unit.label}</h3>
                <p>
                  {unit.street} — {unit.neighborhood}, Sabará/MG — CEP {unit.cep}
                </p>
                <p>WhatsApp: {unit.whatsapp}</p>
                <p>Horário: {unit.hours}</p>
                <p>Responsável técnico, CRF, AFE e alvará: confira no balcão desta loja.</p>
              </article>
            ))}
          </section>

          <section>
            <h2>Orientação farmacêutica</h2>
            <p>
              Dúvida de medicamento, dosagem ou interação: fale com o farmacêutico da loja do seu
              bairro, no horário de funcionamento.
            </p>
            <p>
              {COMPANY.regulators.crfmg.name}: {COMPANY.regulators.crfmg.phone}.{" "}
              <a href={COMPANY.regulators.crfmg.url} target="_blank" rel="noreferrer">
                crfmg.org.br
              </a>
            </p>
            <p>
              {COMPANY.regulators.vigilancia.name}: {COMPANY.regulators.vigilancia.phone}.
            </p>
          </section>

          <section>
            <h2>Avisos sanitários</h2>
            {COMPANY.anvisaWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </section>

          <p>
            © {new Date().getFullYear()} União Farma. Todos os direitos reservados. {COMPANY.legalName}.
          </p>
        </div>
      </div>
      <ContentSiteFooter />
    </>
  );
}
