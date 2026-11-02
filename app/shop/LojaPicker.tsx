"use client";

import { useEffect, useRef, useState } from "react";
import { UNITS } from "../site-config";
import { readPreferredUnitId, writePreferredUnitId } from "../preferred-unit";
import { IconFechar } from "../reserva/ReservaIcons";
import { EVENTO_ABRIR_LOJA } from "./loja-evento";

/** Janela "Escolha sua loja": grava a loja preferida do cliente (a mesma usada pelas ofertas e pelo banner). */
export default function LojaPicker() {
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<string | null>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const abrir = () => {
      setAtual(readPreferredUnitId());
      setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR_LOJA, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_LOJA, abrir);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => fecharRef.current?.focus(), 20);
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="loja-picker-raiz" role="dialog" aria-modal="true" aria-labelledby="loja-picker-titulo">
      <button type="button" className="loja-picker-fundo" aria-label="Fechar" tabIndex={-1} onClick={() => setAberto(false)} />
      <div className="loja-picker">
        <div className="loja-picker-topo">
          <h2 id="loja-picker-titulo">Escolha sua loja</h2>
          <button ref={fecharRef} type="button" className="reserva-icone" aria-label="Fechar" onClick={() => setAberto(false)}>
            <IconFechar size={24} />
          </button>
        </div>
        <ul>
          {UNITS.map((unit) => (
            <li key={unit.id}>
              <button
                type="button"
                className={atual === unit.id ? "loja-picker-opcao is-on" : "loja-picker-opcao"}
                aria-pressed={atual === unit.id}
                onClick={() => {
                  writePreferredUnitId(unit.id);
                  setAberto(false);
                }}
              >
                <strong>{unit.shortName}</strong>
                <small>{unit.shortAddress}</small>
              </button>
            </li>
          ))}
        </ul>
        <p className="reserva-aviso">Sua escolha fica só neste aparelho e serve para as reservas e ofertas.</p>
      </div>
    </div>
  );
}
