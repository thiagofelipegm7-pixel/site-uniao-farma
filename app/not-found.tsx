/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { SiteDirectoryLinks } from "./SiteDirectoryLinks";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-content">
        <img
          src="/uniao-farma-logo.webp"
          alt="Logo da União Farma"
          width="88"
          height="88"
        />
        <p className="section-kicker">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>
          O endereço acessado não existe ou foi alterado. Volte ao início ou encontre uma das nossas
          unidades.
        </p>
        <div className="not-found-actions">
          <a href="/" className="button button-whatsapp compact-button">
            Voltar ao início
          </a>
          <a href="/#unidades-rapidas" className="button button-call compact-button">
            Encontrar uma unidade
          </a>
          <a href="/ofertas" className="button button-call compact-button">
            Ver ofertas
          </a>
        </div>
        <nav className="not-found-site-map" aria-label="Navegação do site">
          <SiteDirectoryLinks />
        </nav>
      </div>
    </main>
  );
}
