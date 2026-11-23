"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "../../analytics";
import { registrarEtapa } from "../../funil";
import { abrirReserva } from "../../reserva/abrir-reserva";
import BotaoCesta from "../../reserva/BotaoCesta";
import { formatarCentavos, adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem, tetoDoItem } from "../../reserva/reserva-store";
import { useReserva } from "../../reserva/useReserva";
import { useDisponibilidade } from "../../reserva/useDisponibilidade";
import VisualizacaoRapida from "../../reserva/VisualizacaoRapida";
import type { ApresentacaoPublica } from "../../apresentacao-produto-tipos";
import type { PromocaoQuantidade } from "../../promocao-quantidade-tipos";
import { carregarPromocoesQuantidade } from "../../promocao-quantidade-cliente";

type Props = {
  unitId: string;
  nome: string;
  precoCentavos: number;
  foto?: string | null;
  /** Unidades que restam na loja (1 a 5): a cesta não passa disso. */
  max?: number;
  /** Página do produto: confere a disponibilidade ao vivo. */
  slug?: string;
  apresentacoes?: ApresentacaoPublica[];
};

/** Barra fixa da página do produto. O nome fica na tela, não no analytics. */
export default function ProdutoBarra({ unitId, nome, precoCentavos, foto, max: maxPublicado, slug, apresentacoes }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);
  const qtdProduto = estado.itens.filter((i) => i.unitId === unitId && (slug ? i.slug === slug : i.nome === nome)).reduce((soma, i) => soma + i.qtd, 0);
  const [abrirOpcoes, setAbrirOpcoes] = useState(false);
  const [promocao, setPromocao] = useState<PromocaoQuantidade | undefined>();
  useEffect(() => {
    let cancelado = false;
    void carregarPromocoesQuantidade().then((promocoes) => {
      if (!cancelado && slug) setPromocao(promocoes.find((p) => p.slug === slug));
    }).catch(() => undefined);
    return () => { cancelado = true; };
  }, [slug]);
  const promocaoEfetiva = apresentacoes && apresentacoes.length > 1 ? undefined : promocao;
  // Estoque de agora: se acabou depois da última publicação, não deixa adicionar; se restam poucos, limita a quantidade.
  const vivo = useDisponibilidade(true);
  const nivel = slug && vivo ? vivo[slug] : undefined;
  const acabou = nivel === 0;
  const max = nivel !== undefined && nivel >= 1 && nivel <= 5 ? nivel : maxPublicado;
  const tetoProduto = tetoDoItem({ max });
  const restante = Math.max(0, tetoProduto - qtdProduto);

  if (apresentacoes && apresentacoes.length > 1) {
    const precoMinimo = Math.min(...apresentacoes.map((a) => a.precoCentavos));
    const adicionarEscolhida = (quantidade: number, escolha?: ApresentacaoPublica) => {
      if (!escolha || restante === 0) return;
      atualizarReserva((s) => adicionar(s, {
        unitId,
        nome,
        precoCentavos: escolha.precoCentavos,
        foto: escolha.foto ?? foto,
        ...(promocaoEfetiva ? { promocao: promocaoEfetiva } : {}),
        variante: { id: escolha.id, nome: escolha.nome },
        ...(max !== undefined ? { max } : {}),
        ...(slug ? { slug } : {}),
      }, quantidade));
      trackEvent("reserva_add", { unit: unitId, source: "produto_nacoes" });
      registrarEtapa("add");
    };
    return (
      <div className="produto-barra">
        {qtdProduto === 0 ? <p className="produto-barra-preco"><small>Preço por unidade a partir de</small><strong>{formatarCentavos(precoMinimo)}</strong></p> : null}
        <button type="button" className="produto-adicionar" disabled={restante === 0 || acabou} onClick={() => setAbrirOpcoes(true)}>
          {restante === 0 || acabou ? "Sem unidades disponíveis" : "Escolher apresentação"}
        </button>
        {qtdProduto > 0 ? <button type="button" className="produto-ver-reserva" onClick={() => abrirReserva()}>Ver cesta ({qtdProduto})</button> : null}
        <VisualizacaoRapida open={abrirOpcoes} nome={nome} precoCentavos={precoCentavos} foto={foto} slug={slug} max={restante} apresentacoes={apresentacoes} onClose={() => setAbrirOpcoes(false)} onAdicionar={adicionarEscolhida} onAbrirCesta={() => abrirReserva()} />
      </div>
    );
  }

  if (qtd === 0 && acabou) {
    return (
      <div className="produto-barra">
        <button type="button" className="produto-adicionar" disabled>
          Acabou agora na loja
        </button>
      </div>
    );
  }

  const adicionarPrimeira = () => {
    atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, foto, ...(promocaoEfetiva ? { promocao: promocaoEfetiva } : {}), ...(max ? { max } : {}), ...(slug ? { slug } : {}) }));
    trackEvent("reserva_add", { unit: unitId, source: "produto_nacoes" });
    registrarEtapa("add");
  };

  return (
    <div className="produto-barra">
      {qtd === 0 ? <p className="produto-barra-preco"><small>{promocaoEfetiva ? "Leve mais e pague menos · preço por unidade" : "Preço"}</small><strong>{formatarCentavos(precoCentavos)}</strong></p> : null}
      {promocaoEfetiva ? <p className="produto-barra-promocao">{(promocaoEfetiva.faixas ?? []).map((faixa) => `${faixa.quantidade} un.: ${formatarCentavos(faixa.precoUnitarioCentavos)} cada`).join(" · ")}</p> : null}
      <BotaoCesta
        quantidade={qtd}
        teto={tetoDoItem({ max })}
        nome={nome}
        rotulo="Adicionar à cesta"
        aoAdicionar={adicionarPrimeira}
        aoMudar={(novo) => atualizarReserva((s) => definirQtd(s, id, novo))}
      />
      {qtd > 0 ? (
        <button type="button" className="produto-ver-reserva" onClick={() => abrirReserva()}>
          Ver cesta
        </button>
      ) : null}
    </div>
  );
}
