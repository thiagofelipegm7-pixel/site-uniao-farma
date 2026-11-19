"use client";

/* eslint-disable @next/next/no-img-element -- Imagem única do produto, controlada pelo catálogo público. */

import { useEffect, useRef, useState } from "react";
import { formatarCentavos, MAX_POR_ITEM } from "./reserva-store";
import "./visualizacao-rapida.css";

type Props = {
  open: boolean;
  nome: string;
  precoCentavos: number;
  deCentavos?: number;
  foto?: string | null;
  slug?: string;
  receita?: "receita" | "controlado";
  max?: number;
  onClose: () => void;
  onAdicionar: (quantidade: number) => void;
  onAbrirCesta: () => void;
};

/** Prévia leve do produto: confirma quantidade e escolha antes de atualizar a cesta. */
export default function VisualizacaoRapida({ open, nome, precoCentavos, deCentavos, foto, slug, receita, max, onClose, onAdicionar, onAbrirCesta }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const abrirCestaAposFechar = useRef(false);
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);
  const limite = typeof max === "number" && max >= 1 ? Math.min(MAX_POR_ITEM, Math.floor(max)) : MAX_POR_ITEM;
  const desconto = deCentavos && deCentavos > precoCentavos ? Math.round((deCentavos - precoCentavos) / deCentavos * 100) : null;

  useEffect(() => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    if (open) {
      if (!dialogo.open) dialogo.showModal();
    } else if (dialogo.open) {
      dialogo.close();
    }
  }, [open]);

  const fechar = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className="uf-quick-view"
      aria-labelledby="uf-quick-view-titulo"
      onClose={() => {
        onClose();
        setQuantidade(1);
        setAdicionado(false);
        if (abrirCestaAposFechar.current) {
          abrirCestaAposFechar.current = false;
          onAbrirCesta();
        }
      }}
      onClick={(evento) => { if (evento.target === evento.currentTarget) fechar(); }}
    >
      <button className="uf-quick-view__fechar" type="button" aria-label="Fechar visualização" onClick={fechar}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg>
      </button>

      {adicionado ? (
        <div className="uf-quick-view__sucesso" role="status" aria-live="polite">
          <span className="uf-quick-view__check" aria-hidden="true">✓</span>
          <p className="uf-quick-view__eyebrow">Cesta atualizada</p>
          <h2 id="uf-quick-view-titulo">Produto adicionado</h2>
          <p>{quantidade} × {nome}</p>
          <div className="uf-quick-view__sucesso-acoes">
            <button type="button" className="uf-quick-view__botao uf-quick-view__botao--secundario" onClick={fechar}>Continuar comprando</button>
            <button type="button" className="uf-quick-view__botao" onClick={() => { abrirCestaAposFechar.current = true; fechar(); }}>Ver cesta</button>
          </div>
        </div>
      ) : (
        <div className="uf-quick-view__conteudo">
          <div className="uf-quick-view__foto">
            {foto ? <img src={foto} alt={nome} /> : <span aria-hidden="true">💊</span>}
          </div>
          <div className="uf-quick-view__info">
            <p className="uf-quick-view__eyebrow">Visualização rápida</p>
            <h2 id="uf-quick-view-titulo">{nome}</h2>
            <div className="uf-quick-view__precos">
              <strong>{formatarCentavos(precoCentavos)}</strong>
              {deCentavos && deCentavos > precoCentavos ? <del>{formatarCentavos(deCentavos)}</del> : null}
              {desconto ? <span>{desconto}% OFF</span> : null}
            </div>
            <p className="uf-quick-view__nota">Preço e disponibilidade serão confirmados pela loja ao concluir o pedido.</p>
            {receita ? (
              <p className="uf-quick-view__receita">
                {receita === "controlado" ? "Este medicamento exige receita e retirada na loja." : "Este medicamento exige receita. A loja orientará a conferência e a retirada."}
              </p>
            ) : null}
            <div className="uf-quick-view__entrega">
              <strong>Retirada ou entrega</strong>
              <span>Combine a opção disponível com a loja ao finalizar a cesta.</span>
            </div>
            <div className="uf-quick-view__rodape">
              <div className="uf-quick-view__quantidade" aria-label="Quantidade a adicionar">
                <button type="button" aria-label="Diminuir quantidade" disabled={quantidade <= 1} onClick={() => setQuantidade((atual) => Math.max(1, atual - 1))}>−</button>
                <span aria-live="polite">{quantidade}</span>
                <button type="button" aria-label="Aumentar quantidade" disabled={quantidade >= limite} onClick={() => setQuantidade((atual) => Math.min(limite, atual + 1))}>+</button>
              </div>
              <button type="button" className="uf-quick-view__botao" onClick={() => { onAdicionar(quantidade); setAdicionado(true); }}>
                Adicionar à cesta
              </button>
            </div>
            {slug ? <a className="uf-quick-view__detalhes" href={`/nacoes-unidas/produtos/${slug}`}>Ver todos os detalhes do produto <span aria-hidden="true">→</span></a> : null}
          </div>
        </div>
      )}
    </dialog>
  );
}
