"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useState } from "react";
import { SetasRolagem } from "./SetasRolagem";
import ReservarBotao from "../reserva/ReservarBotao";
import CartaoPanvel from "../nacoes-unidas/produtos/CartaoPanvel";
import { quantidadeDoNome } from "../nacoes-unidas/produtos/quantidade";
import { formatarCentavos } from "../reserva/reserva-store";

type Destaque = { nome: string; slug: string; lab?: string; precoCentavos: number; foto: string | null; isMIP?: boolean };

/**
 * Encadeia as vitrines da home pela ordem (`posicao`): cada uma espera a anterior e não repete produto que já apareceu acima.
 * Cada elemento resolve com todos os produtos mostrados até aquela vitrine.
 */
const cadeia: Array<Promise<Set<string>>> = [];

type Props = {
  /** Ordem da vitrine na página (0, 1, 2…). Com ela, a vitrine não repete produtos das anteriores. */
  posicao?: number;
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
 * Vitrine de produtos: título à esquerda, "Ver tudo" e setas de rolagem à direita no desktop, fileira rolável.
 * Busca no navegador em /api/destaques (cache de 5 min) para a home continuar estática e o preço nunca ficar congelado.
 * Só entram produtos com foto (cartão com o espaço da imagem vazio parece site quebrado). Se a busca falhar ou não houver nenhum, a seção some.
 */
export default function DestaquesSemana({ posicao, titulo = "Destaques da semana", grupo, lab, ate, n = 8, verTodasHref = "/nacoes-unidas/produtos", verTodas = true, source = "destaques_home", id = "destaques" }: Props = {}) {
  const [itens, setItens] = useState<Destaque[]>([]);
  const [lista, setLista] = useState<HTMLUListElement | null>(null);

  useEffect(() => {
    let ativo = true;
    // Pede mais itens que o necessário para sobrar o bastante depois de tirar os que já apareceram em outra vitrine.
    const pedir = posicao === undefined ? n : Math.min(36, n * 3);
    const consulta = new URLSearchParams({ n: String(pedir), fotos: "1", ...(grupo ? { grupo } : {}), ...(lab ? { lab } : {}), ...(ate ? { ate: String(ate) } : {}) });
    const anterior: Promise<Set<string>> = posicao ? (cadeia[posicao - 1] ?? Promise.resolve(new Set<string>())) : Promise.resolve(new Set<string>());
    const busca = fetch(`/api/destaques?${consulta}`, { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .catch(() => null) as Promise<{ itens?: Destaque[] } | null>;
    const minha = Promise.all([anterior, busca]).then(([usados, dados]) => {
      const livres = (dados?.itens ?? []).filter((item) => !usados.has(item.slug)).slice(0, n);
      if (ativo && livres.length) setItens(livres);
      return new Set([...usados, ...livres.map((item) => item.slug)]);
    });
    if (posicao !== undefined) cadeia[posicao] = minha;
    return () => {
      ativo = false;
    };
  }, [grupo, lab, ate, n, posicao]);

  if (itens.length === 0) return null;

  return (
    <section className="shop-destaques" id={id} aria-labelledby={`${id}-titulo`}>
      <div className="shop-destaques-topo">
        <h2 id={`${id}-titulo`}>{titulo}</h2>
        <div className="shop-destaques-acoes">
          {verTodas && verTodasHref ? <a href={verTodasHref}>Ver tudo</a> : null}
          <SetasRolagem alvo={lista} rotulo={titulo} />
        </div>
      </div>
      <div className="shop-vitrine">
        <ul className="shop-destaques-lista" ref={setLista}>
          {itens.map((item) => (
            <CartaoPanvel
              key={item.slug}
              vertical
              href={`/nacoes-unidas/produtos/${item.slug}`}
              nome={item.nome}
              foto={item.foto}
              marca={item.lab}
              medicamento={item.isMIP}
              classificacao={item.isMIP ? (/gen[eé]rico/i.test(item.nome) ? "generico" : "isento") : null}
              apresentacao={quantidadeDoNome(item.nome)}
              precoFmt={formatarCentavos(item.precoCentavos)}
              cesta={<ReservarBotao unitId="nacoes" nome={item.nome} precoCentavos={item.precoCentavos} foto={item.foto} source={source} variante="cartao" slug={item.slug} />}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
