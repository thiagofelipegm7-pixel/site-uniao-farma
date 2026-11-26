"use client";

import { useEffect, useState } from "react";
import CestaSugestoes from "../reserva/CestaSugestoes";
import { useReserva } from "../reserva/useReserva";

/**
 * Recomendações baseadas nos itens da cesta.
 * Usa o sistema existente de "Combina com" (pares estáticos filtrados).
 * Em produção, pode ser alimentado por dados agregados de pedidos (sem expor saúde).
 */
export default function RecomendacoesReais() {
  const estado = useReserva();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setMostrar(estado.itens.length > 0);
  }, [estado.itens.length]);

  if (!mostrar) return null;

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#0e7370" }}>
        Quem levou isso também escolheu
      </h2>
      <CestaSugestoes itens={estado.itens} max={4} variante="pagina" />
    </section>
  );
}
