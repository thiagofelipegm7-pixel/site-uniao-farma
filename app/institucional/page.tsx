import type { Metadata } from "next";
import { COMPANY, UNIT_LEGAL } from "../company";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { SITE_URL } from "../site-config";

export const metadata: Metadata = {
  title: { absolute: "Dados institucionais | União Farma Sabará" },
  description:
    "Razão social, CNPJ, endereços das três lojas em Sabará e avisos sanitários da União Farma.",
  alternates: { canonical: `${SITE_URL}/institucional` },
};

export default function InstitutionalPage() {
  return (
    <>
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
