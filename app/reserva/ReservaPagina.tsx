/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
"use client";

import { useState } from "react";
import { trackEvent } from "../analytics";
import { UNITS } from "../site-config";
import { IconCasa, IconLixeira, IconLoja, IconMais, IconMenos } from "./ReservaIcons";
import {
  atualizarReserva,
  definirQtd,
  formatarCentavos,
  limpar,
  subtotalCentavos,
  type ModoReserva,
} from "./reserva-store";
import ReservaEnvio from "./ReservaEnvio";
import { useReserva } from "./useReserva";

export default function ReservaPagina() {
  const estado = useReserva();
  const [revisando, setRevisando] = useState(false);

  if (estado.itens.length === 0) {
    return (
      <div className="reserva-vazia reserva-vazia-pagina">
        <h1>Sua reserva está vazia</h1>
        <p>Toque no “Reservar” de um produto para separar. Você fecha pelo WhatsApp e paga só na loja.</p>
        <a className="reserva-botao" href="/nacoes-unidas/produtos">Ver produtos</a>
      </div>
    );
  }

  const escolher = (modo: ModoReserva) => atualizarReserva((s) => ({ ...s, modo }));

  return (
    <>
      <a className="reserva-link" href="/nacoes-unidas/produtos">Continuar escolhendo produtos</a>
      <h1>{revisando ? "Enviar pelo WhatsApp" : "Minha reserva"}</h1>

      {!revisando ? (
        <>
          <ul className="reserva-itens reserva-itens-pagina">
            {estado.itens.map((item) => (
              <li key={item.id}>
                {item.foto ? <img src={item.foto} alt="" width="56" height="56" loading="lazy" decoding="async" /> : null}
                <div className="reserva-item-info">
                  <span className="reserva-item-nome">{item.nome}</span>
                  <small>{UNITS.find((u) => u.id === item.unitId)?.shortName}</small>
                  <div className="reservar-contador reservar-contador-pequeno" role="group" aria-label={`Quantidade de ${item.nome}`}>
                    <button type="button" aria-label={item.qtd === 1 ? `Remover ${item.nome}` : `Diminuir ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd - 1))}>
                      {item.qtd === 1 ? <IconLixeira size={18} /> : <IconMenos size={18} />}
                    </button>
                    <output aria-live="polite">{item.qtd}</output>
                    <button type="button" aria-label={`Aumentar ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd + 1))}>
                      <IconMais size={18} />
                    </button>
                  </div>
                </div>
                <strong>{formatarCentavos(item.precoCentavos * item.qtd)}</strong>
              </li>
            ))}
          </ul>
          <p className="reserva-subtotal"><span>Subtotal estimado</span><strong>{formatarCentavos(subtotalCentavos(estado.itens))}</strong></p>
          <p className="reserva-aviso">A loja confirma preço e estoque pelo WhatsApp. Nada é cobrado no site.</p>

          <fieldset className="reserva-modo">
            <legend>Como você quer receber?</legend>
            <label className={estado.modo === "retirar" ? "is-on" : ""}>
              <input type="radio" name="modo" checked={estado.modo === "retirar"} onChange={() => escolher("retirar")} />
              <IconLoja size={28} />
              <span><strong>Retirar na loja</strong><small>Pague no balcão, na hora da retirada.</small></span>
            </label>
            <label className={estado.modo === "casa" ? "is-on" : ""}>
              <input type="radio" name="modo" checked={estado.modo === "casa"} onChange={() => escolher("casa")} />
              <IconCasa size={28} />
              <span><strong>Receber em casa</strong><small>Pague na entrega. A loja confirma taxa e prazo pelo WhatsApp.</small></span>
            </label>
          </fieldset>

          <div className="reserva-acoes">
            <button type="button" className="reserva-botao" onClick={() => { setRevisando(true); trackEvent("reserva_revisar", { modo: estado.modo, itens: estado.itens.length }); }}>
              Revisar e enviar
            </button>
            <button type="button" className="reserva-link" onClick={() => atualizarReserva(limpar)}>Limpar reserva</button>
          </div>
        </>
      ) : (
        <>
          <button type="button" className="reserva-link" onClick={() => setRevisando(false)}>Voltar para a reserva</button>
          <ReservaEnvio estado={estado} />
          <h2>Depois de enviar</h2>
          <ol className="reserva-passos">
            <li>A loja confirma o preço e o estoque pelo WhatsApp, dentro do horário de atendimento.</li>
            <li>Você combina a retirada ou a entrega.</li>
            <li>O pagamento é feito no balcão ou na entrega.</li>
          </ol>
        </>
      )}
    </>
  );
}
