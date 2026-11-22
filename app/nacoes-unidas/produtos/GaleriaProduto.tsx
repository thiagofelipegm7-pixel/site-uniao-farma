import "./galeria-produto.css";
"use client";

import { useState } from "react";

/**
 * Galeria da ficha: foto principal grande e, quando há mais de uma foto, uma coluna de miniaturas à esquerda.
 * Com uma foto só, mostra apenas a imagem (sem miniaturas).
 */
export default function GaleriaProduto({ fotos, alt }: { fotos: readonly string[]; alt: string }) {
  const [ativa, setAtiva] = useState(0);
  const indice = ativa < fotos.length ? ativa : 0;
  const atual = fotos[indice];
  return (
    <>
      {fotos.length > 1 ? (
        <ul className="pdp-miniaturas" aria-label="Fotos do produto">
          {fotos.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                className={i === indice ? "pdp-miniatura is-ativa" : "pdp-miniatura"}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                aria-current={i === indice ? "true" : undefined}
                onClick={() => setAtiva(i)}
              >
                <img src={src} alt="" width="56" height="56" loading="lazy" decoding="async" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <img className="pdp-foto-principal" src={atual} alt={alt} width="420" height="420" />
    </>
  );
}
