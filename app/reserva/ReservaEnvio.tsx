"use client";

import { buildWhatsAppUrl, UNITS } from "../site-config";
import { IconWhats } from "./ReservaIcons";
import { mensagemReserva, porLoja, type ReservaEstado } from "./reserva-store";

export const TEXTO_RESPONSAVEL = "Responsável técnico das 3 lojas: João · CRF/MG 31958.";

/** Prévia e botão de envio. Uma seção por loja. O nome do produto fica só na mensagem, nunca no analytics. */
export default function ReservaEnvio({ estado }: { estado: ReservaEstado }) {
  const grupos = porLoja(estado).flatMap(({ unitId, itens }) => {
    const unit = UNITS.find((u) => u.id === unitId);
    if (!unit) return [];
    return [{ unit, mensagem: mensagemReserva(unit.shortName, itens, estado.modo) }];
  });

  return (
    <div className="reserva-envios">
      {grupos.length > 1 ? (
        <p className="reserva-aviso">Produtos de lojas diferentes saem separados: uma mensagem por loja.</p>
      ) : null}
      {grupos.map(({ unit, mensagem }) => {
        const href = buildWhatsAppUrl(unit, mensagem, { campaign: "reserva", content: `reserva_${unit.id}` });
        return (
          <section key={unit.id} className="reserva-envio" aria-label={`Enviar para ${unit.shortName}`}>
            <h2>{unit.shortName}</h2>
            <pre className="reserva-mensagem">{mensagem}</pre>
            <a
              className="reserva-botao reserva-botao-whats"
              href={href}
              target="_blank"
              rel="noreferrer"
              data-track-event="whatsapp_click"
              data-track-unit={unit.id}
              data-track-source="reserva_envio"
            >
              <IconWhats size={26} />
              Enviar pedido pelo WhatsApp
            </a>
            <p className="reserva-aviso reserva-rt">{TEXTO_RESPONSAVEL}</p>
          </section>
        );
      })}
    </div>
  );
}
