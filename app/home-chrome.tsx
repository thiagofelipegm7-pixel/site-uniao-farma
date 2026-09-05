"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Native links keep the Novidades route working in Vinext production. */

import { useEffect, useState, type ReactNode } from "react";
import { trackEvent } from "./analytics";
import { buildWhatsAppUrl, UNITS } from "./site-config";

export type SelectorIntent = {
  title: string;
  description: string;
  message: string;
  eventName: string;
};

export const deliveryIntent: SelectorIntent = {
  title: "Consultar entrega",
  description: "Escolha a unidade mais próxima para verificar o atendimento no seu bairro.",
  message:
    "Olá! Vim pelo site da União Farma e gostaria de saber se vocês entregam no meu bairro. Posso informar meu endereço?",
  eventName: "delivery_inquiry",
};

export const SHORT_UNIT_ADDRESSES = {
  fatima: "Rua Cláudio, 902 · Fátima",
  nacoes: "Rua Inglaterra, 162 · Nações Unidas",
  itacolomi: "Rua Joaquim F. Moreira, 489 · Itacolomi",
} as const;

export const categories = [
  {
    icon: "medicine",
    title: "Medicamentos",
    text: "Consulte disponibilidade e condições de atendimento diretamente com uma unidade. Produtos sujeitos a prescrição seguem os requisitos aplicáveis.",
  },
  {
    icon: "beauty",
    title: "Beleza e perfumaria",
    text: "Cuidados para pele, rosto, corpo e rotina de beleza.",
  },
  {
    icon: "hair",
    title: "Cuidados com os cabelos",
    text: "Shampoos, condicionadores, cremes e finalizadores.",
  },
  {
    icon: "hygiene",
    title: "Higiene pessoal",
    text: "Itens para o cuidado diário de toda a família.",
  },
  {
    icon: "baby",
    title: "Mamãe e bebê",
    text: "Fraldas, higiene infantil e produtos para a rotina do bebê.",
  },
  {
    icon: "vitamins",
    title: "Vitaminas e suplementos",
    text: "Consulte marcas, apresentações e disponibilidade na unidade.",
  },
];

export const reviews = [
  {
    author: "Beatriz Cristina",
    text: "Atendimento excelente, todos são muito gentis e as entregas chegam rapidamente.",
  },
  {
    author: "Thais Juliane",
    text: "Sempre que preciso compro lá. Preço ótimo e atendimento maravilhoso!",
  },
  {
    author: "Kenner Alcino",
    text: "A melhor farmácia da região.",
  },
];

export function WhatsAppIcon() {
  return (
    <img
      className="inline-icon"
      src="/whatsapp-icon.svg"
      alt=""
      width="24"
      height="24"
      aria-hidden="true"
    />
  );
}

export function PhoneIcon({ size = 24 }: { size?: number }) {
  return <LineIcon name="phone" size={size} />;
}

export function GoogleMapIcon({ size = 24 }: { size?: number }) {
  return <LineIcon name="map" size={size} />;
}

export function InstagramIcon() {
  return (
    <img
      className="inline-icon instagram-icon"
      src="/instagram-icon.jpg"
      alt=""
      width="24"
      height="24"
      aria-hidden="true"
    />
  );
}

export function LineIcon({ name, size = 24 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    medicine: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M9 7h6M12 11v6M9 14h6" />
      </>
    ),
    perfume: (
      <>
        <path d="M9 3h6v4H9zM8 7h8l2 4v10H6V11z" />
        <path d="M9 13h6M11 17h2" />
      </>
    ),
    syringe: (
      <>
        <path d="m14 5 5 5M16.5 2.5l5 5M12 7l5 5-8 8H4v-5z" />
        <path d="m4 20-2 2M9 10l5 5" />
      </>
    ),
    delivery: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 4v3h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
      </>
    ),
    care: (
      <>
        <path d="M12 21s-8-4.7-8-11a4 4 0 0 1 7-2.7A4 4 0 0 1 20 10c0 6.3-8 11-8 11z" />
        <path d="M9 12h6M12 9v6" />
      </>
    ),
    pressure: (
      <>
        <path d="M5 8h8a4 4 0 0 1 4 4v3" />
        <rect x="3" y="5" width="7" height="6" rx="2" />
        <circle cx="18" cy="17" r="3" />
        <path d="M18 17l1.5-1.5M13 12h2" />
      </>
    ),
    glucose: (
      <>
        <path d="M12 3s5 5.2 5 10a5 5 0 0 1-10 0c0-4.8 5-10 5-10z" />
        <path d="M9.5 14.5c.7 1.2 1.5 1.8 2.5 1.8" />
      </>
    ),
    payment: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19M7 15h3" />
      </>
    ),
    beauty: (
      <>
        <path d="M12 3c1.5 2.7 3.5 4.1 6 4.5-2.5.5-4.5 1.9-6 4.5-1.5-2.6-3.5-4-6-4.5C8.5 7.1 10.5 5.7 12 3z" />
        <path d="M7 14c.8 1.5 2 2.4 3.5 2.7C9 17 7.8 17.9 7 19.5c-.8-1.6-2-2.5-3.5-2.8C5 16.4 6.2 15.5 7 14z" />
      </>
    ),
    hair: (
      <>
        <path d="M7 20c-1-5 0-9 3-12 2-2 5-3 8-3-1 5-3 9-7 12" />
        <path d="M6 13c3 1 5 3 6 7" />
      </>
    ),
    hygiene: (
      <>
        <path d="M8 3h8v4H8zM7 7h10v14H7z" />
        <path d="M9 12h6M9 16h6" />
      </>
    ),
    baby: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21c.5-5 3-8 7-8s6.5 3 7 8" />
        <path d="M10 8h.01M14 8h.01M10.5 10.5c1 .7 2 .7 3 0" />
      </>
    ),
    vitamins: (
      <>
        <path d="M8 3h8v4H8zM7 7h10v14H7z" />
        <path d="m12 10 1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.4z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    map: (
      <>
        <path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    phone: (
      <path d="M7 3H4.5A1.5 1.5 0 0 0 3 4.5C3 13.6 10.4 21 19.5 21a1.5 1.5 0 0 0 1.5-1.5V17l-4-1.5-1.5 3a15.2 15.2 0 0 1-10-10L8.5 7z" />
    ),
    external: (
      <>
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
  };

  return (
    <svg
      className="line-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`faq-item ${open ? "is-open" : ""}`}>
      <button type="button" className="faq-question" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-icon" aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <div className="faq-answer" hidden={!open}>
        <p>{a}</p>
      </div>
    </article>
  );
}

export function UnitSelectorModal({
  intent,
  onClose,
}: {
  intent: SelectorIntent | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!intent) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [intent, onClose]);

  if (!intent) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="unit-selector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unit-selector-title"
        onMouseDown={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        <p className="section-kicker">Atendimento pelo WhatsApp</p>
        <h2 id="unit-selector-title">{intent.title}</h2>
        <p className="modal-description">{intent.description}</p>
        <div className="modal-unit-list">
          {UNITS.map((unit) => (
            <a
              className="modal-unit-option"
              key={unit.id}
              href={buildWhatsAppUrl(unit, intent.message.replaceAll("{unidade}", unit.shortName))}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                trackEvent("unit_selection", { unit: unit.id, intent: intent.eventName });
                trackEvent("whatsapp_click", { unit: unit.id, source: "unit_selector", intent: intent.eventName });
                onClose();
              }}
            >
              <span>
                <strong>{unit.shortName}</strong>
                <small>{unit.address}</small>
              </span>
              <span className="modal-unit-action">
                <WhatsAppIcon /> Abrir conversa
              </span>
            </a>
          ))}
        </div>
        <p className="modal-note">
          Você será direcionado ao WhatsApp da unidade selecionada. Preço, estoque, entrega e
          horários especiais devem ser confirmados com a equipe.
        </p>
      </section>
    </div>
  );
}
