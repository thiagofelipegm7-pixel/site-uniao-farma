/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EVENTO_ABRIR_RESERVA } from "./abrir-reserva";
import { UNITS } from "../site-config";
import { IconFechar, IconLixeira, IconMais, IconMenos, IconSacola } from "./ReservaIcons";
import { atualizarReserva, definirQtd, formatarCentavos, limpar, subtotalCentavos, totalItens } from "./reserva-store";
import { TEXTO_RESPONSAVEL } from "./ReservaEnvio";
import { useReserva } from "./useReserva";

const nomeLoja = (unitId: string) => UNITS.find((u) => u.id === unitId)?.shortName ?? "";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Sacola com contador e a gaveta "Minha reserva" (mini-carrinho). Fica na faixa de identidade, sob o cabeçalho. */
export default function ReservaSacola() {
  const estado = useReserva();
  const [aberta, setAberta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const total = totalItens(estado);

  useEffect(() => {
    const abrir = () => setAberta(true);
    window.addEventListener(EVENTO_ABRIR_RESERVA, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_RESERVA, abrir);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    const gatilho = gatilhoRef.current;
    const fundo = [
      document.querySelector("header"),
      document.querySelector(".brand-strip"),
      document.getElementById("conteudo"),
      document.querySelector("main"),
      document.querySelector("footer"),
      document.querySelector(".uf-footer"),
      document.querySelector(".mobile-quick-nav"),
      document.querySelector(".whatsapp-fab"),
      document.querySelector(".skip-link"),
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);
    fundo.forEach((node) => node.setAttribute("inert", ""));

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => fecharRef.current?.focus(), 20);
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setAberta(false);
        return;
      }
      if (event.key !== "Tab" || !painelRef.current) return;
      const focaveis = Array.from(painelRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => el.tabIndex !== -1);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
      fundo.forEach((node) => node.removeAttribute("inert"));
      gatilho?.focus();
    };
  }, [aberta]);

  const fechar = () => {
    setAberta(false);
    setConfirmando(false);
  };

  const gaveta = (
    <div className="reserva-gaveta-raiz" role="dialog" aria-modal="true" aria-labelledby="reserva-gaveta-titulo">
      <button type="button" className="reserva-gaveta-fundo" aria-label="Fechar a reserva" tabIndex={-1} onClick={fechar} />
      <div className="reserva-gaveta" ref={painelRef}>
        <div className="reserva-gaveta-topo">
          <h2 id="reserva-gaveta-titulo">Reserva · {total} {total === 1 ? "item" : "itens"}</h2>
          <button ref={fecharRef} type="button" className="reserva-icone" aria-label="Fechar" onClick={fechar}>
            <IconFechar size={24} />
          </button>
        </div>

        <div className="reserva-gaveta-corpo">
          {estado.itens.length === 0 ? (
            <div className="reserva-vazia">
              <strong>Sua reserva ainda está vazia. Bora escolher?</strong>
              <p>Separa pra você: reserve aqui e pague só quando retirar.</p>
              <a className="reserva-botao" href="/nacoes-unidas/produtos" onClick={fechar}>Ver produtos</a>
            </div>
          ) : (
            <>
              <ul className="reserva-itens">
                {estado.itens.map((item) => (
                  <li key={item.id}>
                    {item.foto ? <img src={item.foto} alt="" width="44" height="44" loading="lazy" decoding="async" /> : null}
                    <div className="reserva-item-info">
                      <span className="reserva-item-nome">{item.nome}</span>
                      <small>{nomeLoja(item.unitId)}</small>
                      <strong>{formatarCentavos(item.precoCentavos * item.qtd)}</strong>
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
                  </li>
                ))}
              </ul>
              {confirmando ? (
                <div className="reserva-confirma" role="alertdialog" aria-label="Limpar a reserva?">
                  <strong>Limpar a reserva?</strong>
                  <div>
                    <button type="button" className="reserva-botao reserva-botao-vazado" onClick={() => { atualizarReserva(limpar); setConfirmando(false); }}>Sim</button>
                    <button type="button" className="reserva-botao" onClick={() => setConfirmando(false)}>Não</button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        {estado.itens.length > 0 ? (
          <div className="reserva-gaveta-pe">
            <button type="button" className="reserva-link" onClick={() => setConfirmando(true)}>Limpar reserva</button>
            <p className="reserva-subtotal"><span>Subtotal estimado</span><strong>{formatarCentavos(subtotalCentavos(estado.itens))}</strong></p>
            <p className="reserva-aviso">A gente confere o preço e o estoque e te responde pelo WhatsApp. Pagamento no balcão ou na entrega. Nada é cobrado no site.</p>
            <a className="reserva-botao" href="/reserva" onClick={fechar}>Continuar para a reserva</a>
            <p className="reserva-aviso reserva-rt">{TEXTO_RESPONSAVEL}</p>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        className="reserva-sacola"
        aria-label={total === 0 ? "Minha reserva, vazia" : `Minha reserva, ${total} ${total === 1 ? "item" : "itens"}`}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={() => setAberta(true)}
      >
        <IconSacola size={26} />
        <span className="reserva-contador-bolha" aria-hidden="true">{total}</span>
      </button>

      {aberta ? createPortal(gaveta, document.body) : null}
    </>
  );
}
