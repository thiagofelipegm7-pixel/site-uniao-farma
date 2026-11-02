"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import BrandLogo from "./BrandLogo";
import { COMPANY } from "./company";
import { openCookiePreferences } from "./cookie-preferences";

/**
 * Rodapé do protótipo: marca, quem é o responsável técnico, a faixa legal da Anvisa, razão social e CNPJ,
 * e os links Privacidade, Termos e Perguntas. "Cookies" fica porque o cliente precisa poder rever o consentimento (LGPD).
 */
export default function SiteFooter() {
  return (
    <footer className="uf-footer">
      <div className="uf-footer-inner uf-footer-proto">
        <a className="uf-footer-logo" href="/">
          <BrandLogo />
          <span>União Farma · Drogaria e Perfumaria</span>
        </a>
        <p>
          Três lojas em Sabará. Farmacêutico responsável presente em todo o horário de funcionamento. Responsável técnico das 3 lojas: <strong>João</strong> · CRF/MG <strong>31958</strong>.
        </p>
        <p className="uf-footer-warning legal-band">{COMPANY.anvisaWarnings[3]}</p>
        <p className="uf-footer-legal-name">
          {COMPANY.legalName} · CNPJ {COMPANY.cnpj}
        </p>
        <nav className="uf-footer-links" aria-label="Links do rodapé">
          <a href="/privacidade">Privacidade</a>
          <a href="/termos">Termos</a>
          <a href="/perguntas">Perguntas</a>
          <button type="button" className="uf-footer-cookie-link" onClick={openCookiePreferences}>
            Cookies
          </button>
        </nav>
      </div>
    </footer>
  );
}
