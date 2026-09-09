/* eslint-disable @next/next/no-html-link-for-pages */
import type { Metadata } from "next";
import "./photos-fix.css";

export const metadata: Metadata = {
  title: { absolute: "Página não encontrada" },
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", label: "Início" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/receita", label: "Receita" },
  { href: "/#unidades-rapidas", label: "Lojas" },
];

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <img src="/uniao-farma-logo.svg" alt="Logo da União Farma" width="88" height="88" decoding="async" />
        <p className="section-kicker">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>Esse endereço não existe. Escolha um caminho abaixo.</p>
        <nav className="not-found-actions" aria-label="Caminhos do site">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
