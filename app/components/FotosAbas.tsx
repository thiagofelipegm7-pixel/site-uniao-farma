"use client";

import { useEffect, useState } from "react";
import PainelFotos from "./PainelFotos";
import ColecoesPainel from "./ColecoesPainel";
import PainelPromocoes from "./PainelPromocoes";

type Aba = "principal" | "colecoes" | "banners";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "principal", rotulo: "Foto principal" },
  { id: "colecoes", rotulo: "Coleções" },
  { id: "banners", rotulo: "Banners" },
];

/** Tudo de foto numa página só: a foto principal de cada produto e as fotos extras (coleções). A aba fica na URL (?aba=colecoes ou ?aba=banners). */
export default function FotosAbas() {
  const [aba, setAba] = useState<Aba>("principal");

  useEffect(() => {
    const ler = () => {
      const a = new URLSearchParams(window.location.search).get("aba");
      setAba(a === "colecoes" || a === "banners" ? a : "principal");
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
    <div className="fotos-abas">
      <header className="fotos-abas-topo">
        <h1>Fotos</h1>
        <div role="tablist" aria-label="Tipo de foto" className="fotos-abas-lista">
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`aba-${a.id}`}
              aria-selected={aba === a.id}
              aria-controls={`painel-${a.id}`}
              className={aba === a.id ? "fotos-aba is-ativa" : "fotos-aba"}
              onClick={() => escolher(a.id)}
            >
              {a.rotulo}
            </button>
          ))}
        </div>
      </header>
      <div role="tabpanel" id={`painel-${aba}`} aria-labelledby={`aba-${aba}`}>
        {aba === "principal" ? (
          <PainelFotos modo="fotos" nivel={2} titulo="Foto principal" descricao="Envie ou troque a foto principal de cada produto. O filtro “Faltam foto” mostra o que está sem imagem." />
        ) : aba === "colecoes" ? (
          <ColecoesPainel nivel={2} />
        ) : (
          <PainelPromocoes modo="fotos" nivel={2} />
        )}
      </div>
    </div>
  );
}
