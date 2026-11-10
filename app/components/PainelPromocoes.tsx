"use client";

import { useEffect, useState } from "react";

const BANNERS = [
  { id: "hero", nome: "Banner principal (home)", descricao: "Aparece no topo da página inicial" },
  { id: "ofertas", nome: "Banner de ofertas", descricao: "Aparece na seção de ofertas" },
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
      setAviso("Arte enviada. O banner atualiza no site em instantes.");
      setAtuais((prev) => [...prev.filter((b) => b.id !== id), { id, url }]);
    } else {
      setAviso("Não consegui gravar. Tente de novo.");
    }
  }

  return (
    <section className="painel-promocoes" style={{ maxWidth: "40rem", margin: "1.5rem auto", padding: "0 1rem" }}>
      <h1>Promoções</h1>
      <p style={{ color: "#3e4b49", marginBottom: "1.5rem" }}>Troque as artes dos banners do site. Envie uma imagem (JPG ou PNG).</p>
      {aviso ? <p role="status" style={{ padding: "0.75rem", background: "#e8f7f5", borderRadius: "8px" }}>{aviso}</p> : null}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
        {BANNERS.map((b) => {
          const atual = atuais.find((a) => a.id === b.id);
          return (
            <li key={b.id} style={{ padding: "1rem", border: "1px solid #d3e2df", borderRadius: "12px", background: "#fff" }}>
              <strong>{b.nome}</strong>
              <p style={{ margin: "0.25rem 0 0.75rem", color: "#5a6b68", fontSize: "0.875rem" }}>{b.descricao}</p>
              {atual ? <img src={atual.url} alt="" style={{ maxWidth: "100%", maxHeight: "8rem", objectFit: "contain", marginBottom: "0.75rem", borderRadius: "8px" }} /> : null}
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input type="file" accept="image/*" onChange={(e) => enviar(b.id, e.target.files?.[0])} style={{ display: "none" }} />
                <span style={{ padding: "0.5rem 1rem", background: "#0e7370", color: "#fff", borderRadius: "8px", fontWeight: 600 }}>{atual ? "Trocar arte" : "Enviar arte"}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
