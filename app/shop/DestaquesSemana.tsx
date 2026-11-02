"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useState } from "react";
import ReservarBotao from "../reserva/ReservarBotao";
import { formatarCentavos } from "../reserva/reserva-store";

type Destaque = { nome: string; slug: string; precoCentavos: number; foto: string | null };

/**
 * Carrossel "Destaques da semana". Busca no navegador em /api/destaques (cache de 5 min) para a home continuar estática
 * e o preço nunca ficar congelado no build. Se a busca falhar, a seção some.
 */
export default function DestaquesSemana() {
  const [itens, setItens] = useState<Destaque[]>([]);

  useEffect(() => {
    let ativo = true;
    fetch("/api/destaques", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: { itens?: Destaque[] } | null) => {
        if (ativo && dados?.itens?.length) setItens(dados.itens);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  if (itens.length === 0) return null;

  return (
    <section className="shop-destaques" aria-labelledby="destaques-titulo">
      <div className="shop-destaques-topo">
        <h2 id="destaques-titulo">Destaques da semana</h2>
        <a href="/nacoes-unidas/produtos">Ver todas</a>
      </div>
      <p className="shop-destaques-sub">Preço e estoque confirmados pela loja no WhatsApp.</p>
      <ul className="shop-destaques-lista">
        {itens.map((item) => (
          <li key={item.slug}>
            <article className="shop-card">
              <p className="selo-sem-receita-simples">Sem receita</p>
              <a className="shop-card-foto" href={`/nacoes-unidas/produtos/${item.slug}`} aria-label={`Ver ${item.nome}`}>
                {item.foto ? <img src={item.foto} alt="" width="120" height="120" loading="lazy" decoding="async" /> : <span aria-hidden="true" />}
              </a>
              <h3>
                <a href={`/nacoes-unidas/produtos/${item.slug}`}>{item.nome}</a>
              </h3>
              <p className="shop-card-preco">{formatarCentavos(item.precoCentavos)}</p>
              <ReservarBotao unitId="nacoes" nome={item.nome} precoCentavos={item.precoCentavos} foto={item.foto} source="destaques_home" compacto />
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
