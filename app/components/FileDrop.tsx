"use client";

import { useEffect, useRef } from "react";
import "./file-drop.css";

// "File drop" (DesignBookmark), no painel de fotos.
// As molas são as do arquivo original (rigidez e amortecimento), então o movimento é o mesmo.
// O envio de verdade continua com quem chama (onArquivo). Aqui só mostramos o estado:
// "enviando" ativa o anel e "pronto" deixa o círculo verde com o tique.
// Arrastar um arquivo sobre a linha é tratado pelo painel (ele já aceita soltas nas linhas).
// Aqui o clique e o Enter abrem o seletor de arquivo.

export type EstadoEnvioFoto = "parado" | "enviando" | "pronto";

type Props = {
  estado: EstadoEnvioFoto;
  onArquivo: (arquivo: File) => void;
  rotulo: string;
};

const TEXTOS: Record<EstadoEnvioFoto, [string, string]> = {
  parado: ["Enviar foto", "Arraste ou clique aqui"],
  enviando: ["Enviando foto…", "Aguarde um instante"],
  pronto: ["Foto enviada", "Pode trocar quando quiser"],
};

const CIRC = 2 * Math.PI * 33;
const DUR = 2.1;

type Mola = { x: number; v: number; t: number; k: number; c: number };
type Linha = { caixa: HTMLElement; atual: HTMLElement; antiga: HTMLElement | null; o: Mola };
type Controle = { aplicar: (e: EstadoEnvioFoto) => void; pressionar: () => void; sobre: () => void };

const passo = (m: Mola, dt: number) => {
  const a = -m.k * (m.x - m.t) - m.c * m.v;
  m.v += a * dt;
  m.x += m.v * dt;
};
const limita = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
// começa rápido, para no meio como um upload real e chega ao fim
const ritmo = (x: number) => (x < 0.35 ? x * 1.4 : x < 0.6 ? 0.49 + (x - 0.35) * 0.4 : 0.59 + (x - 0.6) * 1.025);

export default function FileDrop({ estado, onArquivo, rotulo }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const nucleo = useRef<HTMLDivElement>(null);
  const verde = useRef<HTMLDivElement>(null);
  const anel = useRef<SVGSVGElement>(null);
  const arco = useRef<SVGCircleElement>(null);
  const seta = useRef<HTMLSpanElement>(null);
  const ok = useRef<HTMLSpanElement>(null);
  const tique = useRef<SVGPathElement>(null);
  const linhaT = useRef<HTMLDivElement>(null);
  const linhaS = useRef<HTMLDivElement>(null);
  const controle = useRef<Controle | null>(null);

  // loop de animação: molas em sub-passos, como o motor original
  useEffect(() => {
    const el = raiz.current, nuc = nucleo.current, gv = verde.current, an = anel.current, arc = arco.current;
    const sx = seta.current, okEl = ok.current, tk = tique.current, lt = linhaT.current, ls = linhaS.current;
    if (!el || !nuc || !gv || !an || !arc || !sx || !okEl || !tk || !lt || !ls) return;

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mola = (x: number, k: number, c: number): Mola => ({ x, v: 0, t: x, k, c: reduzir ? 2 * Math.sqrt(k) : c });

    const ZS = mola(1, 380, 16), ZH = mola(0, 300, 26), CS = mola(1, 420, 14);
    const UP = mola(1, 420, 30), PO = mola(0, 420, 30), RO = mola(0, 300, 30), G = mola(0, 260, 21), K = mola(0, 200, 26);

    arc.style.strokeDasharray = CIRC.toFixed(2);

    const linha = (caixa: HTMLElement, texto: string): Linha => {
      const s = document.createElement("span");
      s.textContent = texto;
      caixa.replaceChildren(s);
      return { caixa, atual: s, antiga: null, o: mola(1, 360, 30) };
    };
    const T = linha(lt, TEXTOS.parado[0]);
    const U = linha(ls, TEXTOS.parado[1]);
    // o texto antigo sai para cima e o novo entra de baixo
    const dizer = (l: Linha, texto: string) => {
      if (l.atual.textContent === texto) return;
      l.antiga?.remove();
      l.antiga = l.atual;
      const s = document.createElement("span");
      s.textContent = texto;
      l.caixa.appendChild(s);
      l.atual = s;
      l.o.x = 0;
      l.o.v = 0;
      l.o.t = 1;
    };

    let fase: EstadoEnvioFoto = "parado";
    let tUp = 0, p = 0, relogio = 0, sobreEm = -9;

    const aplicar = (novo: EstadoEnvioFoto) => {
      if (novo === fase) return;
      fase = novo;
      if (novo === "enviando") {
        tUp = 0;
        p = 0;
        UP.t = 0; PO.t = 1; RO.t = 1; G.t = 0; K.t = 0;
        CS.x = 1.2;
        ZS.x = 0.965;
        dizer(T, TEXTOS.enviando[0]);
        dizer(U, TEXTOS.enviando[1]);
      } else if (novo === "pronto") {
        p = 1;
        PO.t = 0; RO.t = 0; G.t = 1; K.t = 1;
        CS.x = 0.84;
        dizer(T, TEXTOS.pronto[0]);
        dizer(U, TEXTOS.pronto[1]);
      } else {
        G.t = 0; K.t = 0; UP.t = 1; PO.t = 0; RO.t = 0;
        dizer(T, TEXTOS.parado[0]);
        dizer(U, TEXTOS.parado[1]);
      }
    };

    let raf = 0;
    let ultimo = performance.now();
    const quadro = (agora: number) => {
      const dt = Math.min((agora - ultimo) / 1000, 1 / 30);
      ultimo = agora;
      relogio += dt;
      if (fase === "enviando") {
        tUp += dt;
        // o anel para em 90% até o servidor responder
        p = Math.min(0.9, ritmo(tUp / DUR));
      }
      ZH.t = fase !== "enviando" && fase !== "pronto" && relogio - sobreEm < 0.2 ? 1 : 0;
      for (let i = 0; i < 4; i++) {
        for (const m of [ZS, ZH, CS, UP, PO, RO, G, K, T.o, U.o]) passo(m, dt / 4);
      }

      const h = limita(ZH.x, 0, 1);
      el.style.setProperty("--h", h.toFixed(3));
      el.style.transform = `scale(${(ZS.x * (1 + 0.025 * ZH.x)).toFixed(4)})`;
      nuc.style.transform = `translateY(${(-5 * ZH.x).toFixed(2)}px) scale(${CS.x.toFixed(4)})`;
      const balanco = -3.5 * h * (0.5 + 0.5 * Math.sin(relogio * 7));
      sx.style.opacity = limita(UP.x, 0, 1).toFixed(3);
      sx.style.transform = `translateY(${(balanco + (1 - UP.x) * -12).toFixed(2)}px) scale(${(0.6 + 0.4 * UP.x).toFixed(3)})`;
      an.style.opacity = limita(RO.x, 0, 1).toFixed(3);
      arc.style.strokeDashoffset = (CIRC * (1 - p)).toFixed(2);
      gv.style.transform = `scale(${Math.max(0, G.x).toFixed(4)})`;
      okEl.style.opacity = limita(K.x * 4, 0, 1).toFixed(3);
      tk.style.strokeDashoffset = (24 * (1 - limita(K.x, 0, 1))).toFixed(2);

      for (const l of [T, U]) {
        const o = limita(l.o.x, 0, 1);
        l.atual.style.opacity = limita((o - 0.35) / 0.65, 0, 1).toFixed(3);
        l.atual.style.transform = `translateY(${((1 - l.o.x) * 16).toFixed(2)}px)`;
        if (l.antiga) {
          if (o > 0.985) {
            l.antiga.remove();
            l.antiga = null;
          } else {
            l.antiga.style.opacity = limita(1 - o * 1.8, 0, 1).toFixed(3);
            l.antiga.style.transform = `translateY(${(-l.o.x * 16).toFixed(2)}px)`;
          }
        }
      }
      raf = requestAnimationFrame(quadro);
    };

    controle.current = {
      aplicar,
      pressionar: () => { ZS.x = 0.975; },
      sobre: () => { sobreEm = relogio; },
    };
    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      controle.current = null;
    };
  }, []);

  // o estado vindo de fora (enviando, pronto, parado) vira animação
  useEffect(() => {
    controle.current?.aplicar(estado);
  }, [estado]);

  const abrirSeletor = () => {
    if (estado !== "enviando") entrada.current?.click();
  };

  return (
    <>
      <div
        ref={raiz}
        className="fd"
        role="button"
        tabIndex={0}
        aria-label={rotulo}
        aria-disabled={estado === "enviando"}
        onClick={abrirSeletor}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirSeletor();
          }
        }}
        onPointerDown={() => controle.current?.pressionar()}
        onDragOver={(e) => {
          e.preventDefault();
          controle.current?.sobre();
        }}
      >
        <div ref={nucleo} className="fd-nucleo">
          <div ref={verde} className="fd-verde" />
          <svg ref={anel} className="fd-anel" viewBox="0 0 72 72" aria-hidden="true">
            <circle className="fd-trilho" cx="36" cy="36" r="33" />
            <circle ref={arco} className="fd-arco" cx="36" cy="36" r="33" />
          </svg>
          <span ref={seta} className="fd-icone" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
            </svg>
          </span>
          <span ref={ok} className="fd-ok" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path ref={tique} d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        </div>
        <div ref={linhaT} className="fd-linha fd-linha-t" aria-hidden="true" />
        <div ref={linhaS} className="fd-linha fd-linha-s" aria-hidden="true" />
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        tabIndex={-1}
        aria-hidden="true"
        disabled={estado === "enviando"}
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = "";
          if (arquivo) onArquivo(arquivo);
        }}
      />
    </>
  );
}
