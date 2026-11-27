"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos, como no restante da loja. */

import { useEffect, useState } from "react";
import { SetasRolagem } from "./SetasRolagem";
import ReservarBotao from "../reserva/ReservarBotao";
import CartaoPanvel from "../nacoes-unidas/produtos/CartaoPanvel";
import { quantidadeDoNome } from "../nacoes-unidas/produtos/quantidade";
import { formatarCentavos } from "../reserva/reserva-store";

type Oferta = {
  nome: string;
  slug: string;
  lab?: string;
  precoCentavos: number;
  precoAnteriorCentavos?: number;
  descontoPct?: number;
  foto: string;
  isMIP?: boolean;
  restam?: number;
  condicao?: string;
  medicamento?: boolean;
  receita?: "receita";
  promocao?: { faixas: { quantidade: number; precoUnitarioCentavos: number }[] };
};

export default function OfertasSemana({ inicial }: { /** Ofertas já montadas no servidor (HTML pronto e sem "pulo" de layout). */ inicial?: Oferta[] } = {}) {
  const [itens, setItens] = useState<Oferta[]>(inicial ?? []);
  const [lista, setLista] = useState<HTMLUListElement | null>(null);

  useEffect(() => {
    if (inicial !== undefined) return; // o servidor já mandou as ofertas no HTML
    let ativo = true;
    fetch("/api/ofertas-vitrine", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .catch(() => null)
      .then((dados: { itens?: Oferta[] } | null) => {
        if (ativo) setItens(dados?.itens ?? []);
      });
    return () => { ativo = false; };
  }, []);

  if (itens.length === 0) return null;

  return (
    <section className="shop-destaques shop-destaques--ofertas" id="descontos" aria-labelledby="descontos-titulo">
      <div className="shop-destaques-topo">
        <div>
          <h2 id="descontos-titulo">Descontos e ofertas</h2>
        </div>
        <SetasRolagem alvo={lista} rotulo="Descontos e ofertas" />
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
              medicamento={item.medicamento || item.isMIP}
              oferta={!item.condicao}
              descontoPct={item.receita ? null : item.descontoPct}
              precoAnteriorFmt={item.precoAnteriorCentavos ? formatarCentavos(item.precoAnteriorCentavos) : null}
              apresentacao={quantidadeDoNome(item.nome)}
              precoFmt={formatarCentavos(item.precoCentavos)}
              avisos={(item.condicao || item.receita) ? (
                <>
                  {item.condicao ? <span>{item.condicao}</span> : null}
                  {item.receita ? <span>Venda sob prescrição médica</span> : null}
                </>
              ) : undefined}
              cesta={<ReservarBotao unitId="nacoes" nome={item.nome} precoCentavos={item.precoCentavos} deCentavos={item.precoAnteriorCentavos} foto={item.foto} source="home_ofertas" variante="cartao" max={item.restam} slug={item.slug} receita={item.receita} promocao={item.promocao} />}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
