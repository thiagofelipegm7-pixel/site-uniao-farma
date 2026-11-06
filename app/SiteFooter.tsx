"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import MarcaUniao from "./shop/MarcaUniao";
import { COMPANY } from "./company";
import { PUBLIC_UNITS } from "./site-config";
import { openCookiePreferences } from "./cookie-preferences";

/**
 * Rodapé: marca, responsável técnico (CRF), endereço e telefone da loja (Decreto 7.962/2013), a faixa legal da Anvisa, razão social e CNPJ,
 * e os links Privacidade, Termos e Perguntas. "Cookies" fica porque o cliente precisa poder rever o consentimento (LGPD).
 */
export default function SiteFooter() {
  return (
    <footer className="uf-footer">
      <div className="uf-footer-inner uf-footer-proto">
        <a className="uf-footer-logo" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
          <MarcaUniao />
        </a>
        <p>
          Responsável técnico da loja Nações Unidas: <strong>João</strong> · CRF/MG <strong>31958</strong>.
        </p>
        {PUBLIC_UNITS.map((unit) => (
          <p key={unit.id} className="uf-footer-endereco">
            {unit.address} · <a href={unit.phoneLink}>{unit.phone}</a>
          </p>
        ))}
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
