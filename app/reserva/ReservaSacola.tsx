/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EVENTO_ABRIR_RESERVA } from "./abrir-reserva";
import { UNITS } from "../site-config";
import { IconFechar, IconLixeira, IconMais, IconMenos, IconCesta } from "./ReservaIcons";
import { ajustarLimitesAoVivo, atualizarReserva, definirQtd, tetoDoItem, formatarCentavos, limpar, subtotalCentavos, totalItens } from "./reserva-store";
import { useReserva } from "./useReserva";
import { useDisponibilidade } from "./useDisponibilidade";
import { avisosDaCesta } from "../disponibilidade";
import CestaSugestoes from "./CestaSugestoes";

const nomeLoja = (unitId: string) => UNITS.find((u) => u.id === unitId)?.shortName ?? "";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Sacola com contador e a gaveta "Minha cesta" (mini-carrinho). Fica na faixa de identidade, sob o cabeçalho. */
export default function ReservaSacola() {
  const estado = useReserva();
  const vivo = useDisponibilidade(estado.itens.length > 0);
  const avisos = avisosDaCesta(estado.itens, vivo);
  useEffect(() => {
    if (vivo) atualizarReserva((s) => ajustarLimitesAoVivo(s, vivo));
  }, [vivo]);
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

  // Efeito da Panvel: se o zoom (ou a janela) deixar a página estreita (< 992 px, layout de celular), a gaveta que estava
  // aberta se fecha sozinha para não atrapalhar a visão. Só reage ao cruzar o limite: abrir já no celular continua funcionando.
  useEffect(() => {
    const estreita = window.matchMedia("(max-width: 991.98px)");
    const aoMudar = (event: MediaQueryListEvent) => {
      if (!event.matches) return;
      setAberta(false);
      setConfirmando(false);
    };
    estreita.addEventListener("change", aoMudar);
    return () => estreita.removeEventListener("change", aoMudar);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    const gatilho = gatilhoRef.current;
    const fundo = [
      document.querySelector("header"),
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
      <button type="button" className="reserva-gaveta-fundo" aria-label="Fechar a cesta" tabIndex={-1} onClick={fechar} />
      <div className="reserva-gaveta" ref={painelRef}>
        <div className="reserva-gaveta-topo">
          <h2 id="reserva-gaveta-titulo">Cesta · {total} {total === 1 ? "item" : "itens"}</h2>
          <button ref={fecharRef} type="button" className="reserva-icone" aria-label="Fechar" onClick={fechar}>
            <IconFechar size={24} />
          </button>
        </div>

        <div className="reserva-gaveta-corpo">
          {estado.itens.length === 0 ? (
            <div className="reserva-vazia">
              <strong>Sua cesta está vazia.</strong>
              <p>Escolha seus produtos e pague só quando retirar.</p>
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
                      {avisos.some((a) => a.id === item.id && a.tipo === "acabou") ? <small className="fluxo-aviso-estoque" role="alert">Acabou na loja agora</small> : null}
                      <strong>{formatarCentavos(item.precoCentavos * item.qtd)}</strong>
                      <div className="reservar-contador reservar-contador-pequeno" role="group" aria-label={`Quantidade de ${item.nome}`}>
                        <button type="button" aria-label={item.qtd === 1 ? `Remover ${item.nome}` : `Diminuir ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd - 1))}>
                          {item.qtd === 1 ? <IconLixeira size={18} /> : <IconMenos size={18} />}
                        </button>
                        <output aria-live="polite">{item.qtd}</output>
                        <button type="button" aria-label={`Aumentar ${item.nome}`} disabled={item.qtd >= tetoDoItem(item)} title={item.max && item.qtd >= item.max ? `Só restam ${item.max}` : undefined} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, item.qtd + 1))}>
                          <IconMais size={18} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <CestaSugestoes itens={estado.itens} max={3} variante="gaveta" />
              {confirmando ? (
                <div className="reserva-confirma" role="alertdialog" aria-label="Limpar a cesta?">
                  <strong>Limpar a cesta?</strong>
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
            <button type="button" className="reserva-link" onClick={() => setConfirmando(true)}>Limpar cesta</button>
            <p className="reserva-subtotal"><span>Subtotal estimado</span><strong>{formatarCentavos(subtotalCentavos(estado.itens))}</strong></p>
            <a className="reserva-botao" href="/reserva" onClick={fechar}>Continuar para a cesta</a>
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
        aria-label={total === 0 ? "Minha cesta, vazia" : `Minha cesta, ${total} ${total === 1 ? "item" : "itens"}`}
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={() => setAberta(true)}
      >
        <IconCesta size={26} />
        {total > 0 ? <span className="reserva-contador-bolha" aria-hidden="true">{total}</span> : null}
      </button>

      {aberta ? createPortal(gaveta, document.body) : null}
    </>
  );
}
