"use client";

import { useEffect, useRef, useState } from "react";
import { UNITS } from "../site-config";
import { IconFechar, IconLixeira, IconMais, IconMenos, IconSacola } from "./ReservaIcons";
import { atualizarReserva, definirQtd, formatarCentavos, limpar, subtotalCentavos, totalItens } from "./reserva-store";
import { useReserva } from "./useReserva";

const nomeLoja = (unitId: string) => UNITS.find((u) => u.id === unitId)?.shortName ?? "";

/** Sacola com contador e a gaveta "Minha reserva" (mini-carrinho). Fica na faixa de identidade, sob o cabeçalho. */
export default function ReservaSacola() {
  const estado = useReserva();
  const [aberta, setAberta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const total = totalItens(estado);

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => fecharRef.current?.focus(), 20);
    const fechar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberta(false);
    };
    document.addEventListener("keydown", fechar);
    return () => {
      document.body.style.overflow = anterior;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", fechar);
      gatilhoRef.current?.focus();
    };
  }, [aberta]);

  const fechar = () => {
    setAberta(false);
    setConfirmando(false);
  };

  return (
    <>
      <button
        ref={gatilhoRef}
        type="button"
        className="reserva-sacola"
        aria-label={total === 0 ? "Minha reserva, vazia" : `Minha reserva, ${total} ${total === 1 ? "item" : "itens"}`}
        aria-haspopup="dialog"
        onClick={() => setAberta(true)}
      >
        <IconSacola size={26} />
        <span className="reserva-contador-bolha" aria-hidden="true">{total}</span>
      </button>

      {aberta ? (
        <div className="reserva-gaveta-raiz" role="dialog" aria-modal="true" aria-labelledby="reserva-gaveta-titulo">
          <button type="button" className="reserva-gaveta-fundo" aria-label="Fechar a reserva" tabIndex={-1} onClick={fechar} />
          <div className="reserva-gaveta">
            <div className="reserva-gaveta-topo">
              <h2 id="reserva-gaveta-titulo">Reserva · {total} {total === 1 ? "item" : "itens"}</h2>
              <button ref={fecharRef} type="button" className="reserva-icone" aria-label="Fechar" onClick={fechar}>
                <IconFechar size={24} />
              </button>
            </div>

            <div className="reserva-gaveta-corpo">
              {estado.itens.length === 0 ? (
                <div className="reserva-vazia">
                  <strong>Sua reserva está vazia</strong>
                  <p>Toque no “Reservar” de um produto para separar.</p>
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
                <p className="reserva-aviso">A loja confirma preço e estoque pelo WhatsApp. Pagamento no balcão ou na entrega. Nada é cobrado no site.</p>
                <a className="reserva-botao" href="/reserva">Continuar para a reserva</a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
