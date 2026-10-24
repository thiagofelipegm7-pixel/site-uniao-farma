import { OFFERS_GROUP_URL } from "./site-config";

/** Botão único do Grupo de Ofertas no WhatsApp. Texto sem citar medicamentos (Anvisa). */
export default function OffersGroupCta({ placement, className = "" }: { placement: string; className?: string }) {
  return (
    <a
      className={`button button-group-offers ${className}`.trim()}
      href={OFFERS_GROUP_URL}
      target="_blank"
      rel="noreferrer"
      data-track-event="offers_group_click"
      data-track-placement={placement}
    >
      Entre no Grupo de Ofertas
    </a>
  );
}
