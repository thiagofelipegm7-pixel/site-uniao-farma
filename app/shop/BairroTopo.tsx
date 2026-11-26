"use client";

import { useEffect, useState } from "react";
import { lerEntregaEscolhida, CHAVE_ENTREGA } from "../reserva/entrega-escolhida";

export default function BairroTopo() {
  const [bairro, setBairro] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAVE_ENTREGA);
      setBairro(lerEntregaEscolhida(raw));
    } catch {}
  }, []);

  if (!bairro) return null;

  return (
    <div style={{
      background: "#e8f7f5",
      padding: "0.4rem 1rem",
      fontSize: "0.85rem",
      textAlign: "center",
      color: "#0e7370",
      fontWeight: 600,
    }}>
      Entregar em <strong>{bairro}</strong>
    </div>
  );
}
