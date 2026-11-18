"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../analytics";
import { consultarCep, formatarCep, formatarTaxaCentavos, taxaOficialDoBairro } from "../area-entrega";
import { carregarEntregaEscolhida, esquecerEntregaEscolhida, guardarEntregaEscolhida } from "../reserva/entrega-escolhida";
import { TAXA_ENTREGA_CENTAVOS } from "../reserva/reserva-store";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";

const nacoes = PUBLIC_UNITS.find((u) => u.id === "nacoes");

/**
 * "Entregar em …" na faixa do topo: a pessoa digita o CEP ou escolhe o bairro e vê a taxa na hora. O bairro fica só no navegador
 * e já vem marcado na cesta. As taxas e as faixas de CEP são as confirmadas pelo dono (site-config e area-entrega); prazo não é prometido.
 */
export default function EntregarEm() {
  const [bairro, setBairro] = useState<string | null>(null);
  const [cep, setCep] = useState("");
  const dialogo = useRef<HTMLDialogElement>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- o bairro guardado só existe no navegador (a página é estática)
  useEffect(() => setBairro(carregarEntregaEscolhida()), []);

  const area = consultarCep(cep);
  const bairros = nacoes?.deliveryAreas ?? [];

  function abrir() {
    setCep("");
    dialogo.current?.showModal();
  }
  function fechar() {
    dialogo.current?.close();
  }
  function escolher(b: string) {
    guardarEntregaEscolhida(b);
    setBairro(b);
    trackEvent("delivery_check", { source: "faixa_entrega", covered: true });
    fechar();
  }

  const taxa = bairro ? taxaOficialDoBairro(bairro) : null;
  return (
    <>
      <button type="button" className="faixa-entrega-botao" onClick={abrir} aria-haspopup="dialog">
        {bairro && taxa !== null ? <>Entregar em <strong>{bairro}</strong> · {formatarTaxaCentavos(taxa)}</> : <>Entrega a partir de {formatarTaxaCentavos(TAXA_ENTREGA_CENTAVOS)} · <strong>ver no seu CEP</strong></>}
      </button>
      <dialog ref={dialogo} className="faixa-entrega-dialogo" aria-labelledby="faixa-entrega-titulo" onClick={(e) => { if (e.target === dialogo.current) fechar(); }}>
        <div className="faixa-entrega-corpo">
          <div className="faixa-entrega-topo">
            <h2 id="faixa-entrega-titulo">Onde você quer receber?</h2>
            <button type="button" className="faixa-entrega-fechar" onClick={fechar} aria-label="Fechar">×</button>
          </div>
          <label className="faixa-entrega-campo">
            <span>Digite o seu CEP</span>
            <input type="text" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={cep} onChange={(e) => setCep(formatarCep(e.target.value))} maxLength={9} />
          </label>
          <div className="faixa-entrega-resultado" role="status" aria-live="polite">
            {area.status === "incompleto" ? <p>Digite os 8 números do CEP.</p> : null}
            {area.status === "fora" ? <p>Este CEP fica fora da nossa área de entrega. Você pode retirar na loja, sem taxa.</p> : null}
            {area.status === "confirmar" ? (
              <p>
                Este CEP é de um local que precisamos confirmar.{" "}
                {nacoes ? <a href={buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Queria confirmar se entregam no meu CEP.", { campaign: "faixa_entrega", content: "confirmar_cep" })} target="_blank" rel="noreferrer">Confirmar pelo WhatsApp</a> : null}
              </p>
            ) : null}
            {area.status === "atendida" ? (
              <>
                <p>Entregamos no seu CEP. Taxa: <strong>{formatarTaxaCentavos(area.taxaCentavos)}</strong>. Escolha o seu bairro:</p>
                <ul className="faixa-entrega-bairros">
                  {area.bairros.map((b) => <li key={b}><button type="button" onClick={() => escolher(b)}>{b}</button></li>)}
                </ul>
              </>
            ) : null}
            {area.status === "ambigua" ? (
              <>
                <p>O seu CEP atende mais de um bairro, com taxas diferentes. Escolha o seu:</p>
                <ul className="faixa-entrega-bairros">
                  {area.bairros.map((b) => <li key={b}><button type="button" onClick={() => escolher(b)}>{b} · {formatarTaxaCentavos(area.taxasCentavos[b])}</button></li>)}
                </ul>
              </>
            ) : null}
          </div>
          <p className="faixa-entrega-ou">Ou escolha o bairro:</p>
          <ul className="faixa-entrega-bairros">
            {bairros.map((b) => {
              const t = taxaOficialDoBairro(b);
              return <li key={b}><button type="button" onClick={() => escolher(b)} aria-pressed={bairro === b}>{b}{t !== null ? ` · ${formatarTaxaCentavos(t)}` : ""}</button></li>;
            })}
          </ul>
          <p className="faixa-entrega-nota">Taxa e prazo são confirmados pelo WhatsApp da loja antes de fechar o pedido. Retirar na loja não tem taxa. O CEP não é guardado.</p>
          {bairro ? <button type="button" className="faixa-entrega-limpar" onClick={() => { esquecerEntregaEscolhida(); setBairro(null); }}>Esquecer o bairro escolhido</button> : null}
        </div>
      </dialog>
    </>
  );
}
