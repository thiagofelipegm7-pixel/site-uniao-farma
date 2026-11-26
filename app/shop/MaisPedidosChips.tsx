"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useState } from "react";
import { MIN_ITENS } from "../nacoes-unidas/produtos/mais-pedidos";

type Chip = { nome: string; slug: string; foto: string };

/**
 * Faixa de chips logo abaixo do banner: só produtos com pedido real nos últimos 7 dias,
 * em estoque e que não são medicamento. Sem 4 itens a faixa some; nada é inventado.
 */
export default function MaisPedidosChips() {
  const [itens, setItens] = useState<Chip[] | null>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/destaques?ordem=pedidos-semana&n=12&fotos=1", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .catch(() => null)
      .then((dados: { itens?: Chip[] } | null) => {
        if (!ativo) return;
        const lista = (dados?.itens ?? []).filter((item) => item && item.slug && item.nome && item.foto);
        setItens(lista.length >= MIN_ITENS ? lista : []);
      });
    return () => { ativo = false; };
  }, []);

  if (!itens || itens.length < MIN_ITENS) return null;

  return (
    <section className="mais-pedidos-chips" aria-labelledby="mais-pedidos-semana-titulo">
      <h2 id="mais-pedidos-semana-titulo">Mais pedidos da semana</h2>
      <ul className="mais-pedidos-chips-lista">
        {itens.map((item) => (
          <li key={item.slug}>
            <a href={`/nacoes-unidas/produtos/${item.slug}`} className="mais-pedidos-chip">
              <img src={item.foto} alt="" width="40" height="40" loading="lazy" decoding="async" />
              <span>{item.nome}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
