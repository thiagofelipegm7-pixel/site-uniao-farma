"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";
import { BANNERS_PAINEL, type BannerPainel } from "./painel-banners";

function Arte({ banner }: { banner: BannerPainel }) {
  if (!banner.imagem) return <span className="painel-vazio" role="img" aria-label={banner.alt} />;
  return (
    <picture>
      {banner.imagemCelular ? <source media="(max-width: 767px)" srcSet={banner.imagemCelular} /> : null}
      <img src={banner.imagem} alt={banner.alt} decoding="async" draggable={false} />
    </picture>
  );
}

/** Tempo entre trocas automáticas (igual ao carrossel principal da Pague Menos). */
const INTERVALO_MS = 5000;

/**
 * Painel de banners: dois banners lado a lado no computador (um no celular), faixa que rola de lado e trava em cada banner (scroll-snap), com a animação do carrossel da Pague Menos:
 * troca sozinha a cada 5 s, para enquanto o mouse ou o foco está em cima ou a aba está escondida, volta ao primeiro sem corte
 * (clones dos primeiros banners fecham a volta) e o ponto ativo vira uma pílula. Sem movimento automático para quem pede menos movimento.
 * `titulo` cria o h1 da página (só a home usa). Funciona com toque, mouse, teclado e leitor de tela.
 */
export default function PainelBanners({ banners = BANNERS_PAINEL, titulo }: { banners?: BannerPainel[]; titulo?: string }) {
  const faixa = useRef<HTMLUListElement>(null);
  const [atual, setAtual] = useState(0);
  const [custom, setCustom] = useState<BannerPainel[] | null>(null);
  useEffect(() => {
    fetch("/api/banners-publico", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { banners?: { id: string; url: string }[] }) => {
        const lista = d.banners?.filter((b) => b.id.startsWith("hero-")).map((b) => ({ id: b.id, imagem: b.url, alt: "Oferta da União Farma", href: "/nacoes-unidas/produtos" })) ?? [];
        if (lista.length) setCustom(lista);
      })
      .catch(() => {});
  }, []);
  const lista = custom ?? banners;
  const pausado = useRef(false);
  const parou = useRef<ReturnType<typeof setTimeout> | null>(null);
  const n = lista.length;
  const loop = n > 1;

  /** Largura de um passo (um banner mais o espaço entre eles). No computador cabem dois banners; no celular, um. */
  const passo = useCallback((el: HTMLElement) => {
    const a = el.children[0] as HTMLElement | undefined;
    const b = el.children[1] as HTMLElement | undefined;
    return a && b ? b.offsetLeft - a.offsetLeft : el.clientWidth;
  }, []);

  const sincronizar = useCallback(() => {
    const el = faixa.current;
    if (!el || el.clientWidth === 0) return;
    const p = passo(el);
    const bruto = Math.round(el.scrollLeft / p);
    setAtual(bruto >= n ? bruto - n : Math.max(0, bruto));
    // Chegou no clone do primeiro: quando a rolagem assenta, volta ao primeiro de verdade sem ninguém notar.
    if (parou.current) clearTimeout(parou.current);
    parou.current = setTimeout(() => {
      const p = passo(el);
      if (el.scrollLeft >= (n - 0.5) * p && n > 0) {
        el.style.scrollSnapType = "none";
        el.scrollLeft = el.scrollLeft - n * p;
        el.style.scrollSnapType = "";
      }
    }, 120);
  }, [n, passo]);

  useEffect(() => {
    const el = faixa.current;
    if (!el) return;
    el.addEventListener("scroll", sincronizar, { passive: true });
    window.addEventListener("resize", sincronizar);
    return () => {
      el.removeEventListener("scroll", sincronizar);
      window.removeEventListener("resize", sincronizar);
      if (parou.current) clearTimeout(parou.current);
    };
  }, [sincronizar]);

  const ir = useCallback(
    (indice: number) => {
      const el = faixa.current;
      if (!el) return;
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let alvo = indice;
      if (alvo < 0) {
        if (!loop) return;
        // Voltar do primeiro: pula (sem animar) para o clone do primeiro, no fim, e desliza para o último.
        el.style.scrollSnapType = "none";
        el.scrollLeft = n * passo(el);
        el.style.scrollSnapType = "";
        alvo = n - 1;
      }
      alvo = Math.min(loop ? n : n - 1, alvo);
      el.scrollTo({ left: alvo * passo(el), behavior: reduzir ? "auto" : "smooth" });
    },
    [loop, n, passo],
  );

  // Troca automática. Só roda com mais de um banner, sem pedido de menos movimento, com a aba visível e sem mouse/foco em cima.
  const atualRef = useRef(0);
  useEffect(() => {
    atualRef.current = atual;
  }, [atual]);
  useEffect(() => {
    if (!loop || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (pausado.current || document.hidden) return;
      ir(atualRef.current + 1);
    }, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [loop, ir]);

  if (n === 0) return null;

  const pausar = () => {
    pausado.current = true;
  };
  const retomar = () => {
    pausado.current = false;
  };

  return (
    <section
      className="painel"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={pausar}
      onMouseLeave={retomar}
      onFocus={pausar}
      onBlur={retomar}
      onTouchStart={pausar}
      onTouchEnd={retomar}
    >
      {titulo ? <h1 className="sr-only">{titulo}</h1> : null}
      <div className="painel-moldura">
        <ul className="painel-faixa" ref={faixa} tabIndex={0} aria-label="Banners em destaque" aria-live="off">
          {lista.map((banner, i) => (
            <li className="painel-slide" key={banner.id} aria-roledescription="slide" aria-label={`${i + 1} de ${n}`}>
              {banner.href ? (
                <a className="painel-arte" href={banner.href}>
                  <Arte banner={banner} />
                </a>
              ) : (
                <div className="painel-arte">
                  <Arte banner={banner} />
                </div>
              )}
            </li>
          ))}
          {loop
            ? banners.slice(0, 1).map((banner) => (
                <li className="painel-slide" key={`clone-${banner.id}`} aria-hidden="true" inert>
                  <div className="painel-arte">
                    <Arte banner={banner} />
                  </div>
                </li>
              ))
            : null}
        </ul>
        <button type="button" className="painel-seta painel-seta-esq" aria-label="Banner anterior" disabled={!loop} onClick={() => ir(atual - 1)}>
          <IconVoltar size={20} />
        </button>
        <button type="button" className="painel-seta painel-seta-dir" aria-label="Próximo banner" disabled={!loop} onClick={() => ir(atual + 1)}>
          <IconSetaDireita size={20} />
        </button>
      </div>
      <div className="painel-pontos" role="group" aria-label="Escolher banner">
        {lista.map((banner, i) => (
          <button
            type="button"
            key={banner.id}
            className={i === atual ? "is-ativo" : undefined}
            aria-label={`Ir para o banner ${i + 1}`}
            aria-current={i === atual ? "true" : undefined}
            onClick={() => ir(i)}
          />
        ))}
      </div>
    </section>
  );
}
