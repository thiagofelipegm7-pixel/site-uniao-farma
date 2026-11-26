"use client";

import { useEffect, useRef, useState } from "react";
import "./dynamic-menu.css";

export type ItemMenu = { nome: string; href: string };

type Mola = { x: number; v: number; t: number; k: number; c: number };

const mola = (x: number, k = 400, c = 30): Mola => ({ x, v: 0, t: x, k, c });

const reduzirMovimento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ajustar = (s: Mola, k: number, c: number) => {
  s.k = k;
  s.c = reduzirMovimento() ? 2 * Math.sqrt(k) : c;
};

const passo = (s: Mola, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const ALTURA_FECHADA = 52;
const LARGURA_FECHADA = 200;
const ALTURA_LINHA = 48;

export default function DynamicMenu({ itens, titulo = "Departamentos", barra = false }: { itens: ItemMenu[]; titulo?: string; barra?: boolean }) {
  const menuRef = useRef<HTMLDivElement>(null);
  const cabecaRef = useRef<HTMLButtonElement>(null);
  const linha1 = useRef<HTMLElement>(null);
  const linha2 = useRef<HTMLElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const [aberto, setAberto] = useState(false);
  const abertoRef = useRef(false);

  useEffect(() => {
    const menu = menuRef.current;
    const cabeca = cabecaRef.current;
    const l1 = linha1.current;
    const l2 = linha2.current;
    const lista = listaRef.current;
    if (!menu || !cabeca || !l1 || !l2 || !lista) return;

    // Força contraste AAA (vence !important do CSS)
    menu.style.setProperty("background-color", "#042c29", "important");
    cabeca.style.setProperty("color", "#ffffff", "important");
    cabeca.style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
    lista.querySelectorAll("a").forEach((a) => {
      (a as HTMLElement).style.setProperty("color", "#ffffff", "important");
      (a as HTMLElement).style.setProperty("-webkit-text-fill-color", "#ffffff", "important");
    });

    const lis = Array.from(lista.querySelectorAll<HTMLElement>("li")).map((el) => ({ el, s: mola(0, 260, 22) }));
    const W = mola(LARGURA_FECHADA);
    const H = mola(ALTURA_FECHADA);
    const X = mola(0);
    ajustar(W, 320, 26);
    ajustar(H, 240, 22);
    ajustar(X, 380, 24);
    const timers: number[] = [];
    let ultimo = performance.now();
    let rafId = 0;

    const larguraAberta = () => (barra ? 320 : Math.min(320, (menu.parentElement?.clientWidth ?? 320) - 48));

    const definir = (o: boolean) => {
      abertoRef.current = o;
      W.t = o ? larguraAberta() : LARGURA_FECHADA;
      H.t = o ? ALTURA_FECHADA + 4 + lis.length * ALTURA_LINHA + 10 : ALTURA_FECHADA;
      X.t = o ? 1 : 0;
      lis.forEach((l, i) => {
        const atraso = o ? 0.08 + i * 0.05 : (lis.length - 1 - i) * 0.03;
        timers.push(
          window.setTimeout(() => {
            l.s.t = abertoRef.current ? 1 : 0;
          }, atraso * 1000),
        );
      });
      setAberto(o);
    };

    const cliqueCabeca = () => definir(!abertoRef.current);
    const teclado = (e: KeyboardEvent) => {
      if (e.key === "Escape" && abertoRef.current) definir(false);
    };
    cabeca.addEventListener("click", cliqueCabeca);
    window.addEventListener("keydown", teclado);

    const quadro = (agora: number) => {
      const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
      ultimo = agora;
      for (let k = 0; k < 4; k++) {
        const sub = dt / 4;
        passo(W, sub);
        passo(H, sub);
        passo(X, sub);
        lis.forEach((l) => passo(l.s, sub));
      }
      menu.style.width = `${W.x.toFixed(2)}px`;
      menu.style.height = `${H.x.toFixed(2)}px`;
      menu.style.borderRadius = `${(26 - 10 * limitar(X.x, 0, 1)).toFixed(2)}px`;
      const x = limitar(X.x, -0.1, 1.1);
      l1.style.transform = `translateY(${(-4 * (1 - x)).toFixed(2)}px) rotate(${(45 * x).toFixed(2)}deg)`;
      l2.style.transform = `translateY(${(4 * (1 - x)).toFixed(2)}px) rotate(${(-45 * x).toFixed(2)}deg)`;
      lis.forEach((l) => {
        l.el.style.opacity = limitar(l.s.x, 0, 1).toFixed(3);
        l.el.style.transform = `translateY(${((1 - l.s.x) * 18).toFixed(2)}px)`;
      });
      rafId = requestAnimationFrame(quadro);
    };
    rafId = requestAnimationFrame(quadro);

    return () => {
      cabeca.removeEventListener("click", cliqueCabeca);
      window.removeEventListener("keydown", teclado);
      cancelAnimationFrame(rafId);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [barra]);

  return (
    <div className={barra ? "dm-slot dm-slot--barra" : "dm-slot"}>
      <div className="dm-menu" ref={menuRef}>
        <button
          ref={cabecaRef}
          type="button"
          className="dm-cabeca"
          aria-expanded={aberto}
          aria-controls="dm-links"
        >
          <span className="dm-titulo">{titulo}</span>
          <span className="dm-icone" aria-hidden="true">
            <i ref={linha1} />
            <i ref={linha2} />
          </span>
        </button>
        <ul className="dm-links" id="dm-links" ref={listaRef}>
          {itens.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.nome}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
