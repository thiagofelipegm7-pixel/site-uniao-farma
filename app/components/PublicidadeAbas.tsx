"use client";

import { useEffect, useState } from "react";
import PainelFotos from "./PainelFotos";
import PainelPromocoes from "./PainelPromocoes";
import PainelLevePague from "./PainelLevePague";
import "./promocoes-direcao.css";

type Aba = "principal" | "banners" | "promocoes";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "principal", rotulo: "Foto principal" },
  { id: "banners", rotulo: "Banners" },
  { id: "promocoes", rotulo: "Promoções" },
];

/** Tudo o que é imagem numa página só: foto principal, coleções, banners e promoções. A aba fica na URL (?aba=colecoes, ?aba=banners ou ?aba=promocoes). */
export default function PublicidadeAbas() {
  const [aba, setAba] = useState<Aba>("principal");

  useEffect(() => {
    const ler = () => {
      const a = new URLSearchParams(window.location.search).get("aba");
      setAba(a === "banners" || a === "promocoes" ? a : "principal");
    };
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);

  function escolher(id: Aba) {
    setAba(id);
    const url = new URL(window.location.href);
    if (id === "principal") url.searchParams.delete("aba");
    else url.searchParams.set("aba", id);
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="pub-abas">
      <header className="pub-abas-topo">
        <h1>Publicidade</h1>
        <div role="tablist" aria-label="Tipo de imagem" className="pub-abas-lista">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={aba === a.id}
              aria-controls={`painel-${a.id}`}
              className={aba === a.id ? "pub-aba is-ativa" : "pub-aba"}
              onClick={() => escolher(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </header>
      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {aba === "principal" ? (
          <PainelFotos modo="fotos" nivel={2} titulo="" descricao="" />
        ) : aba === "banners" ? (
          <PainelPromocoes modo="fotos" nivel={2} />
        ) : (
          <>
            <PainelLevePague nivel={2} />
            <PainelPromocoes modo="destinos" nivel={2} />
          </>
        )}
      </div>
    </div>
  );
}
