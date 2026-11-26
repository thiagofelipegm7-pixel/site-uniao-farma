"use client";

import { useState } from "react";
import { criarReconhecimento } from "./busca-voz";
import { adicionar, atualizarReserva } from "../reserva/reserva-store";
import { mostrarToast } from "./ToastAdicionado";

export default function AssistenteVoz() {
  const [ouvindo, setOuvindo] = useState(false);
  const [texto, setTexto] = useState("");

  function iniciar() {
    const rec = criarReconhecimento(window);
    if (!rec) {
      alert("Seu navegador não suporta busca por voz.");
      return;
    }
    rec.lang = "pt-BR";
    rec.onresult = (e) => {
      const fala = e.results[0]?.[0]?.transcript || "";
      setTexto(fala);
      processar(fala);
    };
    rec.onend = () => setOuvindo(false);
    rec.onerror = () => setOuvindo(false);
    setOuvindo(true);
    rec.start();
  }

  function processar(fala: string) {
    const lower = fala.toLowerCase();
    // Comandos simples
    if (lower.includes("cesta") || lower.includes("carrinho")) {
      window.location.href = "/reserva";
      return;
    }
    if (lower.includes("buscar") || lower.includes("procurar")) {
      const termo = fala.replace(/buscar|procurar/gi, "").trim();
      if (termo) window.location.href = `/nacoes-unidas/produtos?q=${encodeURIComponent(termo)}`;
      return;
    }
    // Tenta adicionar produto
    mostrarToast(`Ouvi: “${fala}”`);
  }

  return (
    <div style={{ padding: "1rem", textAlign: "center" }}>
      <button
        type="button"
        onClick={iniciar}
        disabled={ouvindo}
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: ouvindo ? "#c62828" : "#0e7370",
          color: "#fff",
          border: 0,
          fontSize: "1.5rem",
          cursor: "pointer",
        }}
        aria-label="Assistente de voz"
      >
        {ouvindo ? "●" : "🎤"}
      </button>
      <p style={{ fontSize: "0.85rem", color: "#3e4b49", marginTop: "0.5rem" }}>
        {ouvindo ? "Ouvindo..." : "Toque para falar"}
      </p>
      {texto && <p style={{ fontSize: "0.9rem" }}>“{texto}”</p>}
    </div>
  );
}
