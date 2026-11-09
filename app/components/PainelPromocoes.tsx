"use client";

import { useState } from "react";

const BANNERS = [
  { id: "hero", nome: "Banner principal (home)", descricao: "Aparece no topo da página inicial" },
  { id: "ofertas", nome: "Banner de ofertas", descricao: "Aparece na seção de ofertas" },
];

export default function PainelPromocoes() {
  const [aviso, setAviso] = useState("");

  async function enviar(id: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setAviso("Enviando...");
    // TODO: implementar upload real
    setTimeout(() => setAviso(`Arte de "${id}" enviada. A publicação pode levar alguns minutos.`), 800);
  }

  return (
    <section className="painel-promocoes" style={{ maxWidth: "40rem", margin: "1.5rem auto", padding: "0 1rem" }}>
      <h1>Promoções</h1>
      <p style={{ color: "#3e4b49", marginBottom: "1.5rem" }}>Troque as artes dos banners do site. Envie uma imagem (JPG ou PNG).</p>
      {aviso ? <p role="status" style={{ padding: "0.75rem", background: "#e8f7f5", borderRadius: "8px" }}>{aviso}</p> : null}
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "1rem" }}>
        {BANNERS.map((b) => (
          <li key={b.id} style={{ padding: "1rem", border: "1px solid #d3e2df", borderRadius: "12px", background: "#fff" }}>
            <strong>{b.nome}</strong>
            <p style={{ margin: "0.25rem 0 0.75rem", color: "#5a6b68", fontSize: "0.875rem" }}>{b.descricao}</p>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
              <input type="file" accept="image/*" onChange={(e) => enviar(b.id, e.target.files?.[0])} style={{ display: "none" }} />
              <span style={{ padding: "0.5rem 1rem", background: "#0e7370", color: "#fff", borderRadius: "8px", fontWeight: 600 }}>Enviar arte</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
