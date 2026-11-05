"use client";

import { useState } from "react";
import { trackEvent } from "../analytics";
import { eventoEntrega, listarBairros, lojaDoBairro, mensagemEntrega } from "../entrega-bairro";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";
import { formatarCentavos } from "../reserva/reserva-store";
import "./entrega.css";

const OUTRO = "__outro__";
const BAIRROS = listarBairros(PUBLIC_UNITS);

/** Seletor de bairro: responde sem rede se a União Farma entrega no bairro e abre o WhatsApp da loja certa. */
export default function EntregaBairro() {
  const [escolha, setEscolha] = useState("");
  const unit = escolha && escolha !== OUTRO ? lojaDoBairro(PUBLIC_UNITS, escolha) : null;

  return (
    <section className="section entrega-bairro" aria-labelledby="entrega-bairro-titulo">
      <div className="section-inner">
        <h2 id="entrega-bairro-titulo">Entregamos no seu bairro?</h2>
        <label htmlFor="entrega-bairro-campo">Escolha o seu bairro</label>
        <select id="entrega-bairro-campo" value={escolha} onChange={(event) => {
            const valor = event.target.value;
            setEscolha(valor);
            if (valor) {
              const evento = eventoEntrega(valor === OUTRO ? null : lojaDoBairro(PUBLIC_UNITS, valor));
              trackEvent(evento.event, evento.params);
            }
          }}
        >
          <option value="">Selecione…</option>
          {BAIRROS.map(({ bairro }) => (
            <option key={bairro} value={bairro}>
              {bairro}
            </option>
          ))}
          <option value={OUTRO}>Outro bairro</option>
        </select>

        <div className="entrega-bairro-resultado" role="status" aria-live="polite">
          {unit ? (
            <>
              <p>
                <strong>Sim, entregamos em {escolha}.</strong> A entrega sai da loja {unit.legalLabel}. Taxa de entrega: {formatarCentavos(unit.deliveryFees?.[escolha] ?? 0)}. O prazo é confirmado no WhatsApp da loja antes de fechar o pedido.
              </p>
              <a
                className="button button-whatsapp"
                href={buildWhatsAppUrl(unit, mensagemEntrega(unit, escolha), { campaign: "entrega_bairro", content: `bairro_${unit.id}` })}
                target="_blank"
                rel="noreferrer"
                data-track-event="whatsapp_click"
                data-track-unit={unit.id}
                data-track-source="entrega_bairro"
              >
                Pedir no WhatsApp da loja {unit.shortName}
              </a>
            </>
          ) : null}
          {escolha === OUTRO ? (
            <p>
              Hoje a entrega é feita só nos bairros da lista. Fale com a loja mais perto pelo WhatsApp e retire o pedido no balcão. <a href="#fora-da-lista">Ver as lojas</a>.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
