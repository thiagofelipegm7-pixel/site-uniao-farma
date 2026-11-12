"use client";

import { useLayoutEffect, useState } from "react";
import { podeRolar } from "./rolagem";

/** Seta completa com haste e ponta em V, traço fino e pontas arredondadas. */
function IconSetaRolagem({ sentido, size = 18 }: { sentido: "esq" | "dir"; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {sentido === "esq" ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

/**
 * Par de botões circulares ← → para o cabeçalho de uma faixa rolável.
 * Recebe o elemento da faixa (via callback ref no pai) para medir o scroll de verdade
 * depois que a lista já entrou no DOM.
 */
export function SetasRolagem({ alvo, rotulo }: { alvo: HTMLElement | null; rotulo: string }) {
  const [esquerda, setEsquerda] = useState(false);
  const [direita, setDireita] = useState(false);

  useLayoutEffect(() => {
    if (!alvo) return;

    const atualizar = () => {
      const estado = podeRolar(alvo);
      setEsquerda(estado.esquerda);
      setDireita(estado.direita);
    };

    const tamanho = typeof ResizeObserver !== "undefined" ? new ResizeObserver(atualizar) : null;
    const observarFilhos = () => {
      if (!tamanho) return;
      for (const filho of alvo.children) tamanho.observe(filho);
    };

    atualizar();
    const quadros = [requestAnimationFrame(atualizar), requestAnimationFrame(() => requestAnimationFrame(atualizar))];
    const depois = window.setTimeout(atualizar, 300);
    alvo.addEventListener("scroll", atualizar, { passive: true });
    alvo.addEventListener("load", atualizar, true);
    window.addEventListener("resize", atualizar);
    tamanho?.observe(alvo);
    observarFilhos();
    const mutacao = typeof MutationObserver !== "undefined" ? new MutationObserver(() => {
      observarFilhos();
      atualizar();
    }) : null;
    mutacao?.observe(alvo, { childList: true });
    return () => {
      for (const id of quadros) cancelAnimationFrame(id);
      window.clearTimeout(depois);
      alvo.removeEventListener("scroll", atualizar);
      alvo.removeEventListener("load", atualizar, true);
      window.removeEventListener("resize", atualizar);
      tamanho?.disconnect();
      mutacao?.disconnect();
    };
  }, [alvo]);

  const rolar = (sentido: 1 | -1) => {
    if (!alvo) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alvo.scrollBy({ left: sentido * Math.max(240, alvo.clientWidth * 0.8), behavior: reduzir ? "auto" : "smooth" });
  };

  return (
    <div className="shop-setas">
      <button type="button" className="shop-seta shop-seta-esq" aria-label={`Anterior em ${rotulo}`} disabled={!esquerda} onClick={() => rolar(-1)}>
        <IconSetaRolagem sentido="esq" />
      </button>
      <button type="button" className="shop-seta shop-seta-dir" aria-label={`Próximo em ${rotulo}`} disabled={!direita} onClick={() => rolar(1)}>
        <IconSetaRolagem sentido="dir" />
      </button>
    </div>
  );
}
