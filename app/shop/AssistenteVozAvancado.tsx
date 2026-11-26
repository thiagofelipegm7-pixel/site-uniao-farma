"use client";

import { useState } from "react";
import { criarReconhecimento } from "./busca-voz";
import { adicionar, atualizarReserva } from "../reserva/reserva-store";
import { mostrarToast } from "./ToastAdicionado";

export default function AssistenteVozAvancado() {
  const [ouvindo, setOuvindo] = useState(false);
  const [ultimo, setUltimo] = useState("");

  function iniciar() {
    const rec = criarReconhecimento(window);
    if (!rec) return;
    rec.lang = "pt-BR";
    rec.onresult = (e) => {
      const fala = e.results[0]?.[0]?.transcript || "";
      setUltimo(fala);
      executar(fala);
    };
    rec.onend = () => setOuvindo(false);
    setOuvindo(true);
    rec.start();
  }

  function executar(fala: string) {
    const lower = fala.toLowerCase();

    // "adicionar X" ou "coloca X"
    const matchAdd = lower.match(/(?:adiciona|adicionar|coloca|colocar|põe|poe)\s+(.+)/);
    if (matchAdd) {
      const produto = matchAdd[1].replace(/\d+/g, "").trim();
      const qtd = parseInt(lower.match(/\d+/)?.[0] || "1");
      atualizarReserva((estado) => {
        let novo = estado;
        for (let i = 0; i < Math.min(qtd, 5); i++) {
          novo = adicionar(novo, { unitId: "nacoes-unidas", nome: produto, precoCentavos: 0 });
        }
        return novo;
      });
      mostrarToast(`${qtd}× ${produto} adicionado`);
      return;
    }

    // "abrir cesta"
    if (lower.includes("cesta") || lower.includes("carrinho")) {
      window.location.href = "/reserva";
      return;
    }

    // "buscar X"
    const matchBusca = lower.match(/(?:busca|buscar|procura|procurar)\s+(.+)/);
    if (matchBusca) {
      window.location.href = `/nacoes-unidas/produtos?q=${encodeURIComponent(matchBusca[1])}`;
      return;
    }

    mostrarToast(`Não entendi: “${fala}”`);
  }

  return (
    <div style={{ textAlign: "center", padding: "0.5rem" }}>
      <button
        type="button"
        onClick={iniciar}
        disabled={ouvindo}
        aria-label="Assistente de voz"
        style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: ouvindo ? "#c62828" : "#0e7370",
          color: "#fff", border: 0, fontSize: "1.4rem", cursor: "pointer",
        }}
      >
        {ouvindo ? "●" : "🎤"}
      </button>
      <p style={{ fontSize: "0.75rem", color: "#666", margin: "0.25rem 0 0" }}>
        {ouvindo ? "Ouvindo..." : "Diga: adiciona dipirona"}
      </p>
      {ultimo && <p style={{ fontSize: "0.8rem" }}>“{ultimo}”</p>}
    </div>
  );
}
