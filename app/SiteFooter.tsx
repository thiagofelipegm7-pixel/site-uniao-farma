"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import AnvisaLogo from "./AnvisaLogo";
import MarcaUniao from "./shop/MarcaUniao";
import { COMPANY } from "./company";
import { PUBLIC_UNITS } from "./site-config";
import { openCookiePreferences } from "./cookie-preferences";

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes") ?? PUBLIC_UNITS[0];

/**
 * Rodapé em blocos: marca e razão social, a loja (endereço, contato e horário), responsabilidade técnica e registros,
 * links institucionais e, embaixo, os avisos legais (Anvisa, preços, LGPD) em texto pequeno com a linha da Anvisa.
 * Só dados reais da União Farma. "Cookies" fica porque o cliente precisa poder rever o consentimento (LGPD).
 */
export default function SiteFooter() {
  return (
    <footer className="rodape">
      <div className="rodape-miolo">
        <div className="rodape-colunas">
          <div className="rodape-bloco">
            <a className="rodape-logo" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
              <MarcaUniao claro />
            </a>
            <p>{COMPANY.legalName}</p>
            <p>CNPJ {COMPANY.cnpj}</p>
          </div>

          <div className="rodape-bloco">
            <p className="rodape-titulo" role="heading" aria-level={2}>Loja Nações Unidas</p>
            <p>{nacoes.address}</p>
            <p>CEP {nacoes.cep}</p>
            <p>WhatsApp {nacoes.whatsapp}</p>
            <p>Telefone <a href={nacoes.phoneLink}>{nacoes.phone}</a></p>
            <p>{nacoes.hoursSummary}</p>
          </div>

          <div className="rodape-bloco">
            <p className="rodape-titulo" role="heading" aria-level={2}>Responsabilidade técnica</p>
            <p>Farmacêutico responsável: João</p>
            <p>CRF/MG 31958</p>
            <p>{COMPANY.alvara}</p>
            <p>{COMPANY.afe}</p>
          </div>

          <nav className="rodape-bloco" aria-label="Links do rodapé">
            <p className="rodape-titulo" role="heading" aria-level={2}>Institucional</p>
            <ul className="rodape-links">
              <li><a href="/privacidade">Privacidade</a></li>
              <li><a href="/termos">Termos</a></li>
              <li><a href="/perguntas">Perguntas</a></li>
              <li>
                <button type="button" onClick={openCookiePreferences}>
                  Cookies
                </button>
              </li>
            </ul>
          </nav>
        </div>

        <div className="rodape-avisos">
          <p className="rodape-legal">
            Para dúvidas, elogios e reclamações, fale com a loja pelo WhatsApp ou pelo telefone acima. As informações contidas neste site não devem ser usadas para automedicação e não substituem, em
            hipótese alguma, as orientações dadas pelo profissional da área médica. Somente o médico está apto a diagnosticar qualquer problema de saúde e prescrever o tratamento adequado. Ao persistirem
            os sintomas, um médico deverá ser consultado. Os preços e promoções divulgados no site valem para a loja Nações Unidas e o pagamento é feito na retirada ou na entrega, nada é cobrado pelo
            site. Maiores esclarecimentos, consultar o site: www.anvisa.gov.br. Seus dados são tratados conforme a Lei Geral de Proteção de Dados (LGPD); veja a{" "}
            <a href="/privacidade">Política de privacidade</a>. Todos os pedidos estão sujeitos à confirmação da disponibilidade de produto em nosso estoque.
          </p>
          <p className="rodape-anvisa">
            A União Farma segue as determinações da <AnvisaLogo />
          </p>
        </div>
      </div>
    </footer>
  );
}
