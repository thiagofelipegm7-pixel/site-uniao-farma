"use client";

import { useState, useRef } from "react";

type Produto = { nome: string; slug: string; precoCentavos: number; foto: string | null };

export default function ReconhecimentoVisual() {
  const [preview, setPreview] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [resultados, setResultados] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function analisar(file: File) {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setAnalisando(true);
    setErro(null);
    setResultados([]);

    try {
      // 1. OCR para extrair texto
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por");
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const texto = data.text.replace(/\s+/g, " ").trim().toLowerCase();
      
      if (texto.length < 3) {
        setErro("Não identifiquei o produto. Tente uma foto mais nítida da embalagem.");
        setAnalisando(false);
        return;
      }

      // 2. Busca no catálogo
      const catalogo: Produto[] = await fetch("/dados/nacoes/catalogo-busca.json").then((r) => r.json());
      
      // Extrai palavras-chave do texto
      const palavras = texto.split(/\s+/).filter((p) => p.length >= 4).slice(0, 5);
      
      // Pontua produtos por correspondência
      const pontuados = catalogo
        .map((p) => {
          const nomeNorm = p.nome.toLowerCase();
          let pontos = 0;
          for (const palavra of palavras) {
            if (nomeNorm.includes(palavra)) pontos += 2;
          }
          return { produto: p, pontos };
        })
        .filter((x) => x.pontos > 0)
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 6)
        .map((x) => x.produto);

      if (pontuados.length === 0) {
        setErro(`Não encontrei “${texto.slice(0, 40)}” no catálogo.`);
      } else {
        setResultados(pontuados);
      }
    } catch {
      setErro("Erro ao analisar. Tente novamente.");
    }
    setAnalisando(false);
  }

  return (
    <div style={{ padding: "1rem", maxWidth: "500px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>Reconhecimento visual</h1>
      <p style={{ color: "#3e4b49", fontSize: "0.9rem", marginBottom: "1rem" }}>
        Tire uma foto da embalagem. O site identifica o produto e mostra opções.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) analisar(file);
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
            width: "100%",
          }}
        >
          Tirar foto da embalagem
        </button>
      ) : (
        <div style={{ textAlign: "center" }}>
          <img src={preview} alt="Prévia" style={{ maxWidth: "200px", borderRadius: "8px", marginBottom: "1rem" }} />
          {analisando && <p style={{ color: "#0e7370" }}>Identificando produto...</p>}
          {erro && <p style={{ color: "#c62828" }}>{erro}</p>}
          
          {resultados.length > 0 && (
            <div style={{ textAlign: "left", marginTop: "1rem" }}>
              <p style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Produtos encontrados:</p>
              {resultados.map((p) => (
                <a
                  key={p.slug}
                  href={`/nacoes-unidas/produtos/${p.slug}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.5rem",
                    borderBottom: "1px solid #eee",
                    textDecoration: "none",
                    color: "#000",
                  }}
                >
                  {p.foto && <img src={p.foto} alt="" width="40" height="40" style={{ objectFit: "contain" }} />}
                  <span style={{ flex: 1, fontSize: "0.9rem" }}>{p.nome}</span>
                  <strong style={{ color: "#0e7370" }}>
                    {(p.precoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </strong>
                </a>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => { setPreview(null); setResultados([]); setErro(null); }}
            style={{ marginTop: "1rem", background: "transparent", border: "1px solid #ccc", borderRadius: "6px", padding: "0.4rem 0.8rem", cursor: "pointer" }}
          >
            Outra foto
          </button>
        </div>
      )}
    </div>
  );
}
