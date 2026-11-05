"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconMicrofone } from "../reserva/ReservaIcons";
import { AVISO_SEM_RESULTADO_VOZ, avisoDeErroVoz, construtorDeVoz, limparTranscricao, type ReconhecedorVoz } from "./voz";
import "./voz.css";

const semAssinatura = () => () => {};
const TEMPO_MAXIMO_MS = 12_000;

/**
 * Botão de microfone para caixas de busca. Usa o reconhecimento de voz do próprio navegador (pt-BR), sem enviar áudio ao nosso servidor.
 * Some quando o navegador não sabe reconhecer voz (ex.: Firefox). O resultado final chega em onTexto.
 */
export default function BotaoVoz({ onTexto, onAtividade, contexto = "produtos" }: { onTexto: (texto: string) => void; onAtividade?: (ativa: boolean) => void; contexto?: string }) {
  const suportado = useSyncExternalStore(semAssinatura, () => construtorDeVoz() !== null, () => false);
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const recRef = useRef<ReconhecedorVoz | null>(null);
  const entregueRef = useRef(false);
  const erroRef = useRef(false);
  const limiteRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTextoRef = useRef(onTexto);
  const onAtividadeRef = useRef(onAtividade);

  useEffect(() => {
    onTextoRef.current = onTexto;
    onAtividadeRef.current = onAtividade;
  });

  // Ao sair da página, solta o microfone.
  useEffect(
    () => () => {
      recRef.current?.abort();
      if (limiteRef.current) clearTimeout(limiteRef.current);
      if (avisoRef.current) clearTimeout(avisoRef.current);
    },
    [],
  );

  const mostrarAviso = (texto: string | null) => {
    if (avisoRef.current) clearTimeout(avisoRef.current);
    setAviso(texto);
    onAtividadeRef.current?.(texto !== null);
    if (texto) {
      avisoRef.current = setTimeout(() => {
        setAviso(null);
        onAtividadeRef.current?.(false);
      }, 6000);
    }
  };

  if (!suportado) return null;

  const parar = () => recRef.current?.stop();

  const comecar = () => {
    const Construtor = construtorDeVoz();
    if (!Construtor) return;
    mostrarAviso(null);
    entregueRef.current = false;
    erroRef.current = false;
    let rec: ReconhecedorVoz;
    try {
      rec = new Construtor();
    } catch {
      mostrarAviso(avisoDeErroVoz("outro"));
      return;
    }
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (evento) => {
      const lista = (evento as { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }).results;
      let texto = "";
      let final = false;
      for (let i = 0; i < lista.length; i += 1) {
        texto += lista[i][0]?.transcript ?? "";
        if (lista[i].isFinal) final = true;
      }
      const limpo = limparTranscricao(texto);
      setParcial(limpo);
      if (final && limpo && !entregueRef.current) {
        entregueRef.current = true;
        onTextoRef.current(limpo);
      }
    };
    rec.onerror = (evento) => {
      erroRef.current = true;
      mostrarAviso(avisoDeErroVoz(evento.error ?? "outro"));
    };
    rec.onend = () => {
      if (limiteRef.current) clearTimeout(limiteRef.current);
      recRef.current = null;
      setOuvindo(false);
      setParcial("");
      onAtividadeRef.current?.(false);
      if (!entregueRef.current && !erroRef.current) mostrarAviso(AVISO_SEM_RESULTADO_VOZ);
    };
    try {
      rec.start();
    } catch {
      mostrarAviso(avisoDeErroVoz("outro"));
      return;
    }
    recRef.current = rec;
    setOuvindo(true);
    onAtividadeRef.current?.(true);
    limiteRef.current = setTimeout(() => recRef.current?.stop(), TEMPO_MAXIMO_MS);
  };

  const nomeAcessivel = ouvindo ? "Parar de ouvir" : "Buscar por voz";
  return (
    <>
      <button
        type="button"
        className={`shop-voz${ouvindo ? " is-ouvindo" : ""}`}
        aria-label={nomeAcessivel}
        aria-pressed={ouvindo}
        data-contexto={contexto}
        onClick={ouvindo ? parar : comecar}
      >
        <IconMicrofone size={22} />
      </button>
      {ouvindo || aviso ? (
        <span className={`shop-voz-aviso${aviso && !ouvindo ? " is-erro" : ""}`} role="status" aria-live="polite">
          {ouvindo ? (parcial ? `Ouvindo: ${parcial}` : "Ouvindo… fale o nome do produto") : aviso}
        </span>
      ) : null}
    </>
  );
}
