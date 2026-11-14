"use client";

import { useEffect, useRef } from "react";
import "./icone-alternar.css";

/*
 * Ícone de duas barras do Dynamic Menu (designbookmark.com/motion): quando "aberto", as barras se encontram
 * no meio e viram um X. A mola é a mesma do menu original (menu.js): X 380 de rigidez, 24 de amortecimento.
 * Com "reduzir movimento", o amortecimento vira crítico (sem sobressalto), como no motion.js.
 */

type Mola = { x: number; v: number; t: number; k: number; c: number };

export default function IconeAlternar({ aberto, size = 20 }: { aberto: boolean; size?: number }) {
  const barra1 = useRef<HTMLElement>(null);
  const barra2 = useRef<HTMLElement>(null);
  const alvo = useRef(aberto);

  useEffect(() => {
    alvo.current = aberto;
  }, [aberto]);

  useEffect(() => {
    const l1 = barra1.current;
    const l2 = barra2.current;
    if (!l1 || !l2) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const X: Mola = { x: alvo.current ? 1 : 0, v: 0, t: alvo.current ? 1 : 0, k: 380, c: reduzir ? 2 * Math.sqrt(380) : 24 };
    let ultimo = performance.now();
    let rafId = 0;

    const quadro = (agora: number) => {
      const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
      ultimo = agora;
      X.t = alvo.current ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        const sub = dt / 4;
        const a = -X.k * (X.x - X.t) - X.c * X.v;
        X.v += a * sub;
        X.x += X.v * sub;
      }
      const x = Math.max(-0.1, Math.min(1.1, X.x));
      // as duas barras, separadas por 4 px, se encontram no meio e giram 45 graus cada uma
      l1.style.transform = `translateY(${(-4 * (1 - x)).toFixed(2)}px) rotate(${(45 * x).toFixed(2)}deg)`;
      l2.style.transform = `translateY(${(4 * (1 - x)).toFixed(2)}px) rotate(${(-45 * x).toFixed(2)}deg)`;
      rafId = requestAnimationFrame(quadro);
    };
    rafId = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <span className="ia-icone" style={{ width: size, height: size }} aria-hidden="true">
      <i ref={barra1} />
      <i ref={barra2} />
    </span>
  );
}
