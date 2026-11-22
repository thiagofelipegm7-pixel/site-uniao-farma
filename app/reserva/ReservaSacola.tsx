/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
"use client";

import BotaoCesta from "./BotaoCesta";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EVENTO_ABRIR_RESERVA } from "./abrir-reserva";
import { IconFechar, IconLixeira, IconCestaArte } from "./ReservaIcons";
import SemFoto from "../nacoes-unidas/produtos/SemFoto";
import "./cesta-modal.css";
import { ajustarLimitesAoVivo, atualizarReserva, definirQtd, itemAtivo, nomePedidoItem, tetoDoItem, formatarCentavos, limpar, precoUnitarioReserva, subtotalCentavos, totalItens } from "./reserva-store";
import { useReserva } from "./useReserva";
import { useDisponibilidade } from "./useDisponibilidade";
import { avisosDaCesta } from "../disponibilidade";
import CestaSugestoes from "./CestaSugestoes";
import { ligarArrastarParaFechar } from "./arrastar-para-fechar";
import { faixaAplicavel, proximaFaixa } from "../promocao-quantidade-tipos";

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
  const origemExternaRef = useRef<HTMLElement | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const puxadorRef = useRef<HTMLButtonElement>(null);
  const fundoRef = useRef<HTMLButtonElement>(null);
  const corpoRef = useRef<HTMLDivElement>(null);
  const total = totalItens(estado);

  useEffect(() => {
    const abrir = (event: Event) => {
      const detalhe = (event as CustomEvent<{ gatilho?: HTMLElement | null }>).detail;
      origemExternaRef.current = detalhe?.gatilho instanceof HTMLElement ? detalhe.gatilho : (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      setAberta(true);
    };
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
    const gatilho = origemExternaRef.current ?? gatilhoRef.current;
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
    // No celular o X some (fecha arrastando para baixo); o foco inicial vai para a alça, que também fecha.
    const timer = window.setTimeout(() => {
      const x = fecharRef.current;
      (x && x.offsetParent !== null ? x : puxadorRef.current)?.focus();
    }, 20);
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
      origemExternaRef.current = null;
    };
  }, [aberta]);

  const fechar = () => {
    setAberta(false);
    setConfirmando(false);
  };

  // Celular: arrastar a folha para baixo fecha a cesta (pela alça/cabeçalho, ou pela lista quando está no topo).
  useEffect(() => {
    if (!aberta || !painelRef.current) return;
    return ligarArrastarParaFechar({
      card: painelRef.current,
      fundo: fundoRef.current,
      corpo: corpoRef.current,
      aoFechar: () => {
        setAberta(false);
        setConfirmando(false);
      },
    });
  }, [aberta]);

  const semPreco = estado.itens.some((i) => itemAtivo(i) && !(i.precoCentavos > 0));
  const gaveta = (
    <div className="reserva-gaveta-raiz cm-raiz" role="dialog" aria-modal="true" aria-labelledby="reserva-gaveta-titulo">
      <button ref={fundoRef} type="button" className="reserva-gaveta-fundo cm-fundo" aria-label="Fechar a cesta" tabIndex={-1} onClick={fechar} />
      <div className="cm-card" ref={painelRef}>
        <button ref={puxadorRef} type="button" className="cm-puxador" aria-label="Fechar cesta" onClick={fechar}>
          <span className="cm-puxador-barra" aria-hidden="true" />
        </button>
        <div className="cm-topo">
          <div className="cm-titulos">
            <h2 id="reserva-gaveta-titulo">Cesta</h2>
            <p className="cm-contagem">{total} {total === 1 ? "item" : "itens"}</p>
          </div>
          <button ref={fecharRef} type="button" className="cm-fechar" aria-label="Fechar" onClick={fechar}>
            <IconFechar size={22} />
          </button>
        </div>

        <div className="cm-corpo" ref={corpoRef}>
          {estado.itens.length === 0 ? (
            <div className="reserva-vazia cm-vazia">
              <IconCestaArte size={96} className="cm-vazia-icone" />
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
                  const outrasApresentacoes = estado.itens.filter((i) => i.id !== item.id && i.unitId === item.unitId && item.slug && i.slug === item.slug).reduce((soma, i) => soma + i.qtd, 0);
                  const teto = Math.max(item.qtd, tetoDoItem(item) - outrasApresentacoes);
                  const faixaAtiva = faixaAplicavel(item.promocao, item.qtd);
                  const proxima = proximaFaixa(item.promocao, item.qtd);
                  return (
                    <li key={item.id} className="cm-item">
                      <span className="cm-foto">
                        {item.foto ? <img src={item.foto} alt="" width="64" height="64" loading="lazy" decoding="async" /> : <SemFoto className="cm-sem-foto" />}
                      </span>
                      <div className="cm-info">
                        <div className="cm-linha-nome">
                          <span className="cm-nome">{nomePedidoItem(item)}</span>
                          <button type="button" className="cm-lixeira" aria-label={`Remover ${nomePedidoItem(item)} da cesta`} onClick={() => atualizarReserva((s) => definirQtd(s, item.id, 0))}>
                            <IconLixeira size={20} />
                          </button>
                        </div>
                        <small className="cm-loja">União Farma</small>
                        {item.receita ? <small className="cm-receita">{item.receita === "controlado" ? "Controlado: retirada na loja com receita" : "Exige receita: retirada na loja"}</small> : null}
                        {faixaAtiva ? <small className="cm-loja">Faixa de {faixaAtiva.quantidade} un. aplicada: {formatarCentavos(faixaAtiva.precoUnitarioCentavos)} cada</small> : proxima ? <small className="cm-loja">Leve {proxima.quantidade}, pague {formatarCentavos(proxima.precoUnitarioCentavos)} cada</small> : null}
                        {avisos.some((a) => a.id === item.id && a.tipo === "acabou") ? <small className="fluxo-aviso-estoque" role="alert">Acabou na loja agora</small> : null}
                        <div className="cm-linha-preco">
                          <span className="cm-preco">
                            {riscado ? <s>{formatarCentavos(riscado)}</s> : null}
                            {proxima ? <small>Próxima faixa: {proxima.quantidade} un. por {formatarCentavos(proxima.precoUnitarioCentavos)} cada</small> : null}
                            <strong>{temPreco ? formatarCentavos(precoUnitarioReserva(item) * item.qtd) : "Consultar"}</strong>
                          </span>
                          <BotaoCesta quantidade={item.qtd} teto={teto} nome={nomePedidoItem(item)} aoAdicionar={() => undefined} aoMudar={(n) => atualizarReserva((s) => definirQtd(s, item.id, n))} />
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
          <IconCestaArte size={34} />
          {total > 0 ? <span key={total} className="reserva-contador-bolha" aria-hidden="true">{total}</span> : null}
        </span>
      </button>

      {aberta ? createPortal(gaveta, document.body) : null}
    </>
  );
}
