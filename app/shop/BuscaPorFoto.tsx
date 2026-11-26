"use client";

import { useState, useRef } from "react";

export default function BuscaPorFoto() {
  const [preview, setPreview] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBuscando(true);
    setResultado(null);

    // Simula busca (em produção: enviar para API de OCR/matching)
    await new Promise((r) => setTimeout(r, 1500));

    // Por enquanto, redireciona para busca com texto extraído ou genérico
    setResultado("Analisando imagem...");
    setBuscando(false);

    // Em produção real, aqui viria o resultado do OCR
    setTimeout(() => {
      window.location.href = "/nacoes-unidas/produtos?q=produto";
    }, 800);
  }

  return (
    <div style={{ padding: "1rem", textAlign: "center" }}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Buscar por foto</h2>
      <p style={{ color: "#3e4b49", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Tire uma foto do produto ou da receita para encontrar mais rápido.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            background: "#0e7370",
            color: "#fff",
            border: 0,
            borderRadius: "12px",
            padding: "1rem 2rem",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Tirar foto ou escolher imagem
        </button>
      ) : (
        <div>
          <img src={preview} alt="Prévia" style={{ maxWidth: "200px", borderRadius: "8px", marginBottom: "1rem" }} />
          {buscando && <p>Analisando...</p>}
          {resultado && <p style={{ color: "#0e7370" }}>{resultado}</p>}
          <button
            type="button"
            onClick={() => { setPreview(null); setResultado(null); }}
            style={{ marginTop: "0.5rem", background: "transparent", border: "1px solid #ccc", borderRadius: "6px", padding: "0.4rem 0.8rem" }}
          >
            Outra foto
          </button>
        </div>
      )}
    </div>
  );
}
