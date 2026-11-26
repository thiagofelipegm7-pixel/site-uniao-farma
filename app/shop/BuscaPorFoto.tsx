"use client";

import { useState, useRef } from "react";

export default function BuscaPorFoto() {
  const [preview, setPreview] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [texto, setTexto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setBuscando(true);
    setTexto(null);
    setErro(null);

    try {
      // Carrega Tesseract dinamicamente
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const extraido = data.text.replace(/\s+/g, " ").trim().slice(0, 80);
      if (extraido.length < 3) {
        setErro("Não consegui ler o texto. Tente uma foto mais nítida.");
      } else {
        setTexto(extraido);
        // Redireciona para a busca com o texto extraído
        setTimeout(() => {
          window.location.href = `/nacoes-unidas/produtos?q=${encodeURIComponent(extraido)}`;
        }, 600);
      }
    } catch {
      setErro("Erro ao analisar a imagem. Tente novamente.");
    }
    setBuscando(false);
  }

  return (
    <div style={{ padding: "1rem", textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Buscar por foto</h1>
      <p style={{ color: "#3e4b49", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Tire uma foto do produto ou da receita. O texto será lido automaticamente.
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
          <img src={preview} alt="Prévia" style={{ maxWidth: "220px", borderRadius: "8px", marginBottom: "1rem" }} />
          {buscando && <p style={{ color: "#0e7370" }}>Lendo o texto da imagem...</p>}
          {texto && <p style={{ color: "#0e7370", fontWeight: 600 }}>Encontrado: “{texto}”</p>}
          {erro && <p style={{ color: "#c62828" }}>{erro}</p>}
          <button
            type="button"
            onClick={() => { setPreview(null); setTexto(null); setErro(null); }}
            style={{ marginTop: "0.75rem", background: "transparent", border: "1px solid #ccc", borderRadius: "6px", padding: "0.4rem 0.8rem", cursor: "pointer" }}
          >
            Outra foto
          </button>
        </div>
      )}
    </div>
  );
}
