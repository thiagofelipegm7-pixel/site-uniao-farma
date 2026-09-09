/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Página não encontrada" },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <img src="/uniao-farma-logo.svg" alt="Logo da União Farma" width="88" height="88" decoding="async" />
        <p className="section-kicker">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>Esse endereço não existe. Escolha um caminho abaixo.</p>
        <div className="not-found-actions">
          <a href="/" className="button button-whatsapp compact-button">Início</a>
          <a href="/ofertas" className="button button-call compact-button">Ofertas</a>
          <a href="/receita" className="button button-call compact-button">Receita</a>
          <a href="/#unidades-rapidas" className="button button-call compact-button">Lojas</a>
        </div>
      </div>
    </div>
  );
}
