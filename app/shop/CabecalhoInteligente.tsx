"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Cabeçalho do desktop que encolhe e expande como o da Panvel (vídeo de 03/11): só a faixa principal (logo, busca, cesta)
 * fica sempre fixa; a faixa de aviso e a barra de acessos deslizam para fora ao rolar e voltam quando a página chega
 * perto do topo. A pílula de abas fica fixa logo abaixo e acompanha a altura do cabeçalho.
 * Só mexe no atributo `data-cab-rolado` do <html>; o resto é CSS (e some com "movimento reduzido").
 * No celular o contêiner usa `display: contents` e nada muda.
 */
export default function CabecalhoInteligente({ children }: { children: ReactNode }) {
  useEffect(() => {
    const raiz = document.documentElement;
    let rolado = window.scrollY > 100;
    const aplicar = () => {
      raiz.dataset.cabRolado = rolado ? "sim" : "nao";
    };
    aplicar();
    const aoRolar = () => {
      // Histerese: recolhe depois de 100 px e só expande de volta abaixo de 40 px, para não ficar piscando.
      const y = window.scrollY;
      const novo = rolado ? y > 40 : y > 100;
      if (novo === rolado) return;
      rolado = novo;
      aplicar();
    };
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      delete raiz.dataset.cabRolado;
    };
  }, []);

  return (
    <div className="cab-espaco">
      <div className="cab-fixo">{children}</div>
    </div>
  );
}
