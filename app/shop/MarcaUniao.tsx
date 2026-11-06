"use client";

import { useEffect, useRef } from "react";

/**
 * Logo só com as letras: "União Farma" em itálico + selo "Drogaria e Perfumaria". Texto vivo, sem ilustração.
 * `claro` é para fundo branco (nome verde). O link que a envolve já tem o nome acessível.
 *
 * Ajuste ao espaço: quando o celular está com a letra ampliada, o logo cresce junto e cobriria os ícones ao lado.
 * Depois de aparecer, ele mede o espaço livre na própria linha (entre o que vem antes e o que vem depois) e encolhe
 * (`zoom`) só o necessário. Em letra normal não muda nada.
 */
export default function MarcaUniao({ claro = false }: { claro?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const logo = ref.current;
    const link = logo?.parentElement;
    const linha = link?.parentElement;
    if (!logo || !link || !linha) return;

    const ajustar = () => {
      logo.style.zoom = "";
      const natural = logo.scrollWidth;
      const caixa = link.getBoundingClientRect();
      if (!natural || caixa.height === 0) return;
      const topo = caixa.top;
      const base = caixa.bottom;
      const dentro = linha.getBoundingClientRect();
      let esquerda = dentro.left;
      let direita = dentro.right;
      for (const irmao of Array.from(linha.children)) {
        if (irmao === link) continue;
        const r = irmao.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const mesmaLinha = r.top < base - 2 && r.bottom > topo + 2;
        if (!mesmaLinha) continue;
        if (r.left + r.width / 2 < caixa.left + caixa.width / 2) esquerda = Math.max(esquerda, r.right);
        else direita = Math.min(direita, r.left);
      }
      const livre = direita - esquerda - 12;
      if (livre > 0 && natural > livre) logo.style.zoom = String(Math.max(0.5, Math.floor((livre / natural) * 100) / 100));
    };

    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(linha);
    window.addEventListener("resize", ajustar);
    void document.fonts?.ready.then(ajustar);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", ajustar);
    };
  }, []);

  return (
    <span ref={ref} className={claro ? "marca-uf marca-uf--claro" : "marca-uf"} aria-hidden="true">
      <span className="marca-uf-texto">
        <span className="marca-uf-nome">União Farma</span>
        <span className="marca-uf-pe">Drogaria e Perfumaria</span>
      </span>
    </span>
  );
}
