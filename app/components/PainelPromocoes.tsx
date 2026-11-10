"use client";

import { useEffect, useState } from "react";

const BANNERS_PRINCIPAIS = Array.from({ length: 14 }, (_, i) => ({
  id: `hero-${i + 1}`,
  nome: `Banner ${i + 1}`,
  descricao: "Carrossel principal",
}));

type Banner = { id: string; url: string };

export default function PainelPromocoes() {
  const [aviso, setAviso] = useState("");
  const [atuais, setAtuais] = useState<Banner[]>([]);

  useEffect(() => {
    fetch("/api/interno/banners", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { banners?: Banner[] }) => setAtuais(d.banners ?? []))
      .catch(() => {});
  }, []);

  async function enviar(id: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setAviso("Enviando...");
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(arquivo);
    });
    const r = await fetch("/api/interno/banners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, url }),
    });
    if (r.ok) {
      setAviso("Arte enviada.");
      setAtuais((prev) => [...prev.filter((b) => b.id !== id), { id, url }]);
    } else {
      setAviso("Não consegui gravar. Tente de novo.");
    }
  }

  return (
    <section style={{ maxWidth: "72rem", margin: "1.5rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>Promoções</h1>
      <p style={{ color: "#5a6b68", marginBottom: "1.5rem" }}>Banners do carrossel principal. Clique para enviar a arte.</p>
      {aviso ? <p role="status" style={{ padding: "0.75rem 1rem", background: "#e8f7f5", borderRadius: "10px", marginBottom: "1rem" }}>{aviso}</p> : null}
      <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e8eeec", padding: "1.25rem" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Banner principal (home)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
          {BANNERS_PRINCIPAIS.map((b) => {
            const atual = atuais.find((a) => a.id === b.id);
            return (
              <label key={b.id} style={{ display: "block", background: "#f8faf9", borderRadius: "12px", border: "1px solid #e8eeec", overflow: "hidden", cursor: "pointer" }}>
                <div style={{ height: "100px", background: atual ? "#fff" : "#f0f4f3", display: "grid", placeItems: "center" }}>
                  {atual ? (
                    <img src={atual.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ color: "#8a9a97", fontSize: "0.75rem" }}>Sem arte</span>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => enviar(b.id, e.target.files?.[0])} style={{ display: "none" }} />
                </div>
                <div style={{ padding: "0.5rem 0.75rem", background: "#fff" }}>
                  <strong style={{ fontSize: "0.85rem" }}>{b.nome}</strong>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
