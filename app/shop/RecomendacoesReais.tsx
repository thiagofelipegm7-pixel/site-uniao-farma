"use client";

import { useEffect, useState } from "react";
import CestaSugestoes from "../reserva/CestaSugestoes";
import { useReserva } from "../reserva/useReserva";

/**
 * Recomendações a partir da cesta, reusando "Compre junto".
 * CestaSugestoes já exclui medicamentos (com ou sem receita) das sugestões
 * e não afirma histórico de outros clientes.
 */
export default function RecomendacoesReais() {
  const estado = useReserva();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    setMostrar(estado.itens.length > 0);
  }, [estado.itens.length]);

  if (!mostrar) return null;

  return (
    <section className="uf-recomendacoes-cesta" style={{ margin: "0.5rem 0 0.25rem" }}>
      <CestaSugestoes itens={estado.itens} max={4} variante="pagina" />
    </section>
  );
}
