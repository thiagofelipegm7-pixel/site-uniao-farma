"use client";

import { useEffect, useState } from "react";

const BANNERS = [
  { id: "hero", nome: "Banner principal", descricao: "Topo da página inicial" },
  { id: "ofertas", nome: "Ofertas", descricao: "Seção de ofertas" },
  { id: "banner3", nome: "Banner 3", descricao: "Espaço para arte" },
  { id: "banner4", nome: "Banner 4", descricao: "Espaço para arte" },
  { id: "banner5", nome: "Banner 5", descricao: "Espaço para arte" },
  { id: "banner6", nome: "Banner 6", descricao: "Espaço para arte" },
  { id: "banner7", nome: "Banner 7", descricao: "Espaço para arte" },
  { id: "banner8", nome: "Banner 8", descricao: "Espaço para arte" },
  { id: "banner9", nome: "Banner 9", descricao: "Espaço para arte" },
  { id: "banner10", nome: "Banner 10", descricao: "Espaço para arte" },
  { id: "banner11", nome: "Banner 11", descricao: "Espaço para arte" },
  { id: "banner12", nome: "Banner 12", descricao: "Espaço para arte" },
  { id: "banner13", nome: "Banner 13", descricao: "Espaço para arte" },
  { id: "banner14", nome: "Banner 14", descricao: "Espaço para arte" },
  { id: "banner15", nome: "Banner 15", descricao: "Espaço para arte" },
];

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
      <p style={{ color: "#5a6b68", marginBottom: "1.5rem" }}>Envie as artes dos banners. Clique no card para adicionar ou trocar a imagem.</p>
      {aviso ? <p role="status" style={{ padding: "0.75rem 1rem", background: "#e8f7f5", borderRadius: "10px", marginBottom: "1rem" }}>{aviso}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
        {BANNERS.map((b) => {
          const atual = atuais.find((a) => a.id === b.id);
          return (
            <label key={b.id} style={{ display: "block", background: "#fff", borderRadius: "16px", border: "1px solid #e8eeec", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.2s, transform 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ height: "140px", background: atual ? "#f8faf9" : "#f0f4f3", display: "grid", placeItems: "center", position: "relative" }}>
                {atual ? (
                  <img src={atual.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <span style={{ color: "#8a9a97", fontSize: "0.85rem" }}>Sem arte</span>
                )}
                <input type="file" accept="image/*" onChange={(e) => enviar(b.id, e.target.files?.[0])} style={{ display: "none" }} />
              </div>
              <div style={{ padding: "1rem" }}>
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>{b.nome}</strong>
                <span style={{ color: "#6b7c79", fontSize: "0.8rem" }}>{b.descricao}</span>
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );
}
