"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useRef, useState } from "react";
import { IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";
import ReservarBotao from "../reserva/ReservarBotao";
import CartaoPanvel from "../nacoes-unidas/produtos/CartaoPanvel";
import { quantidadeDoNome } from "../nacoes-unidas/produtos/quantidade";
import { formatarCentavos } from "../reserva/reserva-store";

type Destaque = { nome: string; slug: string; lab?: string; precoCentavos: number; foto: string | null };

type Props = {
  titulo?: string;
  /** Slug da categoria do catálogo (ex.: "cuidado-diario"). Sem ele, traz itens variados. */
  grupo?: string;
  /** Marca (laboratório/fabricante) do catálogo. */
  lab?: string;
  /** Preço máximo em centavos. */
  ate?: number;
  /** Quantos itens (1 a 12). */
  n?: number;
  /** Link do "Ver tudo". */
  verTodasHref?: string | null;
  verTodas?: boolean;
  source?: string;
  id?: string;
};

/**
 * Vitrine de produtos: título à esquerda, "Ver tudo" à direita e fileira rolável (setas no desktop).
 * Busca no navegador em /api/destaques (cache de 5 min) para a home continuar estática e o preço nunca ficar congelado.
 * Se a busca falhar, a seção some.
 */
export default function DestaquesSemana({ titulo = "Destaques da semana", grupo, lab, ate, n = 8, verTodasHref = "/nacoes-unidas/produtos", verTodas = true, source = "destaques_home", id = "destaques" }: Props = {}) {
  const [itens, setItens] = useState<Destaque[]>([]);
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let ativo = true;
    const consulta = new URLSearchParams({ n: String(n), ...(grupo ? { grupo } : {}), ...(lab ? { lab } : {}), ...(ate ? { ate: String(ate) } : {}) });
    fetch(`/api/destaques?${consulta}`, { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: { itens?: Destaque[] } | null) => {
        if (ativo && dados?.itens?.length) setItens(dados.itens);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [grupo, lab, ate, n]);

  if (itens.length === 0) return null;

  const rolar = (sentido: 1 | -1) => lista.current?.scrollBy({ left: sentido * Math.max(240, lista.current.clientWidth * 0.8), behavior: "smooth" });

  return (
    <section className="shop-destaques" id={id} aria-labelledby={`${id}-titulo`}>
      <div className="shop-destaques-topo">
        <h2 id={`${id}-titulo`}>{titulo}</h2>
        {verTodas && verTodasHref ? <a href={verTodasHref}>Ver tudo</a> : null}
      </div>
      <div className="shop-vitrine">
        <button type="button" className="shop-seta shop-seta-esq" aria-label={`Anterior em ${titulo}`} onClick={() => rolar(-1)}><IconVoltar size={20} /></button>
        <ul className="shop-destaques-lista" ref={lista}>
          {itens.map((item) => (
            <CartaoPanvel
              key={item.slug}
              vertical
              href={`/nacoes-unidas/produtos/${item.slug}`}
              nome={item.nome}
              foto={item.foto}
              marca={item.lab}
              apresentacao={quantidadeDoNome(item.nome)}
              precoFmt={formatarCentavos(item.precoCentavos)}
              cesta={<ReservarBotao unitId="nacoes" nome={item.nome} precoCentavos={item.precoCentavos} foto={item.foto} source={source} variante="cesta" compacto slug={item.slug} />}
            />
          ))}
        </ul>
        <button type="button" className="shop-seta shop-seta-dir" aria-label={`Próximo em ${titulo}`} onClick={() => rolar(1)}><IconSetaDireita size={20} /></button>
      </div>
    </section>
  );
}
