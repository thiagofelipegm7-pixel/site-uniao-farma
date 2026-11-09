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

/**
 * Painel de banners da home: faixa que rola de lado e trava em cada banner (scroll-snap), setas redondas nas laterais
 * (a da ponta fica desativada, sem loop) e um ponto por banner. Funciona com toque, mouse, teclado e leitor de tela.
 */
export default function PainelBanners({ banners = BANNERS_PAINEL }: { banners?: BannerPainel[] }) {
  const faixa = useRef<HTMLUListElement>(null);
  const [atual, setAtual] = useState(0);

  const sincronizar = useCallback(() => {
    const el = faixa.current;
    if (!el || el.clientWidth === 0) return;
    setAtual(Math.min(banners.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))));
  }, [banners.length]);

  useEffect(() => {
    const el = faixa.current;
    if (!el) return;
    el.addEventListener("scroll", sincronizar, { passive: true });
    window.addEventListener("resize", sincronizar);
    return () => {
      el.removeEventListener("scroll", sincronizar);
      window.removeEventListener("resize", sincronizar);
    };
  }, [sincronizar]);

  const ir = (indice: number) => {
    const el = faixa.current;
    if (!el) return;
    const alvo = Math.min(banners.length - 1, Math.max(0, indice));
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: alvo * el.clientWidth, behavior: reduzir ? "auto" : "smooth" });
  };

  if (banners.length === 0) return null;

  return (
    <section className="painel" aria-roledescription="carrossel" aria-label="Destaques">
      <h1 className="sr-only">Farmácia em Sabará: União Farma Nações Unidas</h1>
      <div className="painel-moldura">
        <ul className="painel-faixa" ref={faixa} tabIndex={0} aria-label="Banners em destaque">
          {banners.map((banner, i) => (
            <li className="painel-slide" key={banner.id} aria-roledescription="slide" aria-label={`${i + 1} de ${banners.length}`}>
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
        </ul>
        <button type="button" className="painel-seta painel-seta-esq" aria-label="Banner anterior" disabled={atual === 0} onClick={() => ir(atual - 1)}>
          <IconVoltar size={20} />
        </button>
        <button type="button" className="painel-seta painel-seta-dir" aria-label="Próximo banner" disabled={atual === banners.length - 1} onClick={() => ir(atual + 1)}>
          <IconSetaDireita size={20} />
        </button>
      </div>
      <div className="painel-pontos" role="group" aria-label="Escolher banner">
        {banners.map((banner, i) => (
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
