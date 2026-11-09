"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import AnvisaLogo from "./AnvisaLogo";
import MarcaUniao from "./shop/MarcaUniao";
import { COMPANY } from "./company";
import { PUBLIC_UNITS } from "./site-config";
import { openCookiePreferences } from "./cookie-preferences";

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes") ?? PUBLIC_UNITS[0];

/**
 * Rodapé no formato da Droga Raia: fundo claro, um único parágrafo legal corrido em cinza (razão social, CNPJ, endereço,
 * farmacêutico responsável, Alvará e AFE, avisos da Anvisa e da LGPD) e a linha "segue as determinações da ANVISA".
 * Só dados reais da União Farma. Privacidade, Termos, Perguntas e Cookies ficam numa linha pequena (LGPD exige rever o consentimento).
 */
export default function SiteFooter() {
  return (
    <footer className="rodape">
      <div className="rodape-miolo">
        <a className="rodape-logo" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
          <MarcaUniao claro />
        </a>
        <p className="rodape-legal">
          {COMPANY.legalName} | União Farma | CNPJ {COMPANY.cnpj} | {nacoes.address} | CEP {nacoes.cep} | Para dúvidas, elogios e reclamações fale com a loja pelo WhatsApp{" "}
          {nacoes.whatsapp} ou pelo telefone <a href={nacoes.phoneLink}>{nacoes.phone}</a> | Farmacêutico responsável: João | CRF/MG 31958 | {COMPANY.alvara} | {COMPANY.afe}. As informações contidas neste site não devem ser
          usadas para automedicação e não substituem, em hipótese alguma, as orientações dadas pelo profissional da área médica. Somente o médico está apto a diagnosticar qualquer problema de saúde e
          prescrever o tratamento adequado. Ao persistirem os sintomas, um médico deverá ser consultado. Os preços e promoções divulgados no site valem para a loja Nações Unidas e o pagamento é feito na
          retirada ou na entrega, nada é cobrado pelo site. Maiores esclarecimentos, consultar o site: www.anvisa.gov.br. Seus dados são tratados conforme a Lei Geral de Proteção de Dados (LGPD); veja a{" "}
          <a href="/privacidade">Política de privacidade</a>. Todos os pedidos estão sujeitos à confirmação da disponibilidade de produto em nosso estoque.
        </p>
        <p className="rodape-anvisa">
          A União Farma segue as determinações da <AnvisaLogo />
        </p>
        <nav className="rodape-links" aria-label="Links do rodapé">
          <a href="/privacidade">Privacidade</a>
          <a href="/termos">Termos</a>
          <a href="/perguntas">Perguntas</a>
          <button type="button" onClick={openCookiePreferences}>
            Cookies
          </button>
        </nav>
      </div>
    </footer>
  );
}
