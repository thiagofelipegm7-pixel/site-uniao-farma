/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EVENTO_ABRIR_RESERVA } from "./abrir-reserva";
import { IconFechar, IconLixeira, IconSetaBaixo, IconCestaLinha } from "./ReservaIcons";
import SemFoto from "../nacoes-unidas/produtos/SemFoto";
import "./cesta-modal.css";
import { ajustarLimitesAoVivo, atualizarReserva, definirQtd, itemAtivo, tetoDoItem, formatarCentavos, limpar, subtotalCentavos, totalItens } from "./reserva-store";
import { useReserva } from "./useReserva";
import { useDisponibilidade } from "./useDisponibilidade";
import { avisosDaCesta } from "../disponibilidade";
import CestaSugestoes from "./CestaSugestoes";

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Sacola com contador e o modal "Cesta" (mini-carrinho): bottom sheet no celular, cartão flutuante à direita no computador. */
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

  const semPreco = estado.itens.some((i) => itemAtivo(i) && !(i.precoCentavos > 0));
  const gaveta = (
    <div className="reserva-gaveta-raiz cm-raiz" role="dialog" aria-modal="true" aria-labelledby="reserva-gaveta-titulo">
      <button type="button" className="reserva-gaveta-fundo cm-fundo" aria-label="Fechar a cesta" tabIndex={-1} onClick={fechar} />
      <div className="cm-card" ref={painelRef}>
        <span className="cm-puxador" aria-hidden="true" />
        <div className="cm-topo">
          <div className="cm-titulos">
            <h2 id="reserva-gaveta-titulo">Cesta</h2>
            <p className="cm-contagem">{total} {total === 1 ? "item" : "itens"}</p>
          </div>
          <button ref={fecharRef} type="button" className="cm-fechar" aria-label="Fechar" onClick={fechar}>
            <IconFechar size={22} />
          </button>
        </div>

        <div className="cm-corpo">
          {estado.itens.length === 0 ? (
            <div className="reserva-vazia cm-vazia">
              <strong>Sua cesta está vazia.</strong>
              <p>Escolha seus produtos e pague só quando retirar.</p>
              <a className="cm-botao cm-botao-cheio" href="/nacoes-unidas/produtos" onClick={fechar}>Ver produtos</a>
            </div>
          ) : (
            <>
              <ul className="cm-itens">
                {estado.itens.map((item) => {
                  const temPreco = item.precoCentavos > 0;
                  // Preço "De" riscado só quando já veio confirmado no dado, e nunca em medicamento com receita ou controlado (Anvisa).
                  const riscado = temPreco && !item.receita && item.deCentavos && item.deCentavos > item.precoCentavos ? item.deCentavos * item.qtd : null;
                  const teto = Math.max(tetoDoItem(item), item.qtd);
                  return (
                    <li key={item.id} className="cm-item">
                      <span className="cm-foto">
                        {item.foto ? <img src={item.foto} alt="" width="64" height="64" loading="lazy" decoding="async" /> : <SemFoto className="cm-sem-foto" />}
                      </span>
                      <div className="cm-info">
                        <div className="cm-linha-nome">
                          <span className="cm-nome">{item.nome}</span>
                          <button type="button" className="cm-lixeira" aria-label={`Remover ${item.nome}`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, 0))}>
                            <IconLixeira size={20} />
                          </button>
                        </div>
                        <small className="cm-loja">União Farma</small>
                        {item.receita ? <small className="cm-receita">{item.receita === "controlado" ? "Controlado: retirada na loja com receita" : "Exige receita: retirada na loja"}</small> : null}
                        {avisos.some((a) => a.id === item.id && a.tipo === "acabou") ? <small className="fluxo-aviso-estoque" role="alert">Acabou na loja agora</small> : null}
                        <div className="cm-linha-preco">
                          <span className="cm-preco">
                            {riscado ? <s>{formatarCentavos(riscado)}</s> : null}
                            <strong>{temPreco ? formatarCentavos(item.precoCentavos * item.qtd) : "Consultar"}</strong>
                          </span>
                          <label className="cm-qtd" title={item.max && item.qtd >= item.max ? `Só restam ${item.max}` : undefined}>
                            <span className="cm-sr">Quantidade de {item.nome}</span>
                            <select value={item.qtd} onChange={(e) => { const qtd = Number(e.target.value); atualizarReserva((s) => definirQtd(s, item.id, qtd)); }}>
                              {Array.from({ length: teto }, (_, n) => n + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <IconSetaBaixo size={14} />
                          </label>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {confirmando ? (
                <div className="reserva-confirma cm-confirma" role="alertdialog" aria-label="Limpar a cesta?">
                  <strong>Limpar a cesta?</strong>
                  <div>
                    <button type="button" className="cm-botao cm-botao-vazado" onClick={() => { atualizarReserva(limpar); setConfirmando(false); }}>Sim</button>
                    <button type="button" className="cm-botao cm-botao-cheio" onClick={() => setConfirmando(false)}>Não</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="cm-limpar" onClick={() => setConfirmando(true)}>Limpar cesta</button>
              )}
              <CestaSugestoes itens={estado.itens} max={3} variante="gaveta" />
            </>
          )}
        </div>

        {estado.itens.length > 0 ? (
          <div className="cm-pe">
            <p className="cm-subtotal">
              <span>Subtotal{semPreco ? " (sem os itens a consultar)" : ""}</span>
              <strong>{formatarCentavos(subtotalCentavos(estado.itens.filter((i) => i.precoCentavos > 0)))}</strong>
            </p>
            <a className="cm-botao cm-botao-cheio" href="/reserva" onClick={fechar}>Ir para a cesta</a>
            <button type="button" className="cm-botao cm-botao-vazado" onClick={fechar}>Continuar comprando</button>
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
        <span className="reserva-sacola-icone">
          <IconCestaLinha size={34} />
          {total > 0 ? <span key={total} className="reserva-contador-bolha" aria-hidden="true">{total}</span> : null}
        </span>
      </button>

      {aberta ? createPortal(gaveta, document.body) : null}
    </>
  );
}
