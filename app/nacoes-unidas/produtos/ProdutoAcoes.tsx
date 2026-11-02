"use client";

import { useState, useSyncExternalStore } from "react";
import { IconCompartilhar, IconCoracao, IconCoracaoLinha } from "../../reserva/ReservaIcons";

const CHAVE = "uf-favoritos-v1";

function lerFavoritos(): string[] {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    const lista = bruto ? (JSON.parse(bruto) as unknown) : [];
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Favoritar (guardado só neste aparelho) e compartilhar o link do produto. Sem rastreio e sem enviar nada a servidor. */
const ouvintes = new Set<() => void>();
function assinar(fn: () => void) {
  ouvintes.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    ouvintes.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

export default function ProdutoAcoes({ slug, titulo }: { slug: string; titulo: string }) {
  const favorito = useSyncExternalStore(
    assinar,
    () => lerFavoritos().includes(slug),
    () => false,
  );
  const [aviso, setAviso] = useState("");

  function alternarFavorito() {
    const atual = lerFavoritos();
    const proximo = atual.includes(slug) ? atual.filter((item) => item !== slug) : [...atual, slug];
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(proximo));
    } catch {
      /* sem armazenamento: o coração só vale nesta tela */
    }
    ouvintes.forEach((fn) => fn());
    setAviso(proximo.includes(slug) ? "Guardado nos favoritos." : "Removido dos favoritos.");
  }

  async function compartilhar() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setAviso("Link copiado.");
    } catch {
      /* o cliente cancelou o compartilhamento */
    }
  }

  return (
    <div className="produto-acoes">
      <button type="button" aria-pressed={favorito} aria-label={favorito ? "Remover dos favoritos" : "Favoritar"} onClick={alternarFavorito}>
        {favorito ? <IconCoracao size={24} /> : <IconCoracaoLinha size={24} />}
      </button>
      <button type="button" aria-label="Compartilhar" onClick={compartilhar}>
        <IconCompartilhar size={24} />
      </button>
      <span className="sr-only" role="status" aria-live="polite">{aviso}</span>
    </div>
  );
}
