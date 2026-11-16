"use client";

import { useEffect } from "react";
import "./page-transition.css";

/**
 * Transição entre páginas. O navegador faz a animação (View Transitions, em Chrome e Edge); onde ela não existe,
 * o conteúdo entra com um leve fade. Ao clicar numa foto de produto da lista, a foto é marcada para "voar" até a página do produto.
 */
export default function PageTransicao() {
  useEffect(() => {
    // Sem a regra @view-transition do navegador, liga o fallback de entrada em fade.
    if (typeof (window as unknown as { CSSViewTransitionRule?: unknown }).CSSViewTransitionRule === "undefined") {
      document.documentElement.classList.add("sem-transicao-nativa");
    }
    function aoClicar(evento: MouseEvent) {
      if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const link = (evento.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.origin !== window.location.origin) return;
      if (!link.pathname.startsWith("/nacoes-unidas/produtos/")) return;
      const foto = link.querySelector<HTMLImageElement>(".pv-img img");
      if (foto) foto.style.viewTransitionName = "foto-produto";
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  return null;
}
