"use client";

/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect, useState } from "react";
import { readPreferredUnitId, sortUnitsByPreference, writePreferredUnitId } from "./preferred-unit";
import { INSTAGRAM_URL, UNITS, buildWhatsAppUrl, type Unit } from "./site-config";

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

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function SiteFooter() {
  const [preferredId, setPreferredId] = useState<Unit["id"] | null>(null);
  const units = sortUnitsByPreference(UNITS, preferredId);

  useEffect(() => {
    setPreferredId(readPreferredUnitId());
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<Unit["id"]>).detail;
      if (detail) setPreferredId(detail);
    };
    window.addEventListener("uf-preferred-unit", onChange);
    return () => window.removeEventListener("uf-preferred-unit", onChange);
  }, []);

  return (
    <footer className="uf-footer">
      <div className="uf-footer-inner">
        <div className="uf-footer-grid">
          <div className="uf-footer-brand">
            <a className="uf-footer-logo" href="/">
              <img src="/icon-192.png" alt="" width="52" height="52" decoding="async" />
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
              <a className="instagram-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram da União Farma">
                <InstagramIcon />
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
            {units.map((unit) => (
              <a
                key={unit.id}
                href={buildWhatsAppUrl(unit, defaultMessage.replaceAll("{unidade}", unit.shortName), {
                  campaign: "footer",
                  content: `footer_${unit.id}`,
                })}
                target="_blank"
                rel="noreferrer"
                onClick={() => writePreferredUnitId(unit.id)}
              >
                {unit.shortName}: {unit.whatsapp}
                {preferredId === unit.id ? " · sua loja" : ""}
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
