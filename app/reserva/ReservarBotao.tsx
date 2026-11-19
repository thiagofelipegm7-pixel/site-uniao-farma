"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./circular-reveal.css";
import { trackEvent } from "../analytics";
import { registrarEtapa } from "../funil";
import { IconMais, IconMaisFino, IconCesta } from "./ReservaIcons";
import BotaoCesta from "./BotaoCesta";
import { abrirReserva } from "./abrir-reserva";
import { adicionar, atualizarReserva, definirQtd, idDoItem, qtdDoItem, tetoDoItem } from "./reserva-store";
import { useReserva } from "./useReserva";
import VisualizacaoRapida from "./VisualizacaoRapida";

type Props = {
  unitId: string;
  nome: string;
  precoCentavos: number;
  /** Preço de antes confirmado (centavos). */
  deCentavos?: number;
  foto?: string | null;
  /** Origem do clique. Só o id da origem, nunca o nome do produto. */
  source?: string;
  /** Cartão de produto do protótipo: só o "+" e, depois, o contador com "−" (sem texto). */
  compacto?: boolean;
  /** Medicamento com receita ou controlado: a cesta marca o item e só deixa retirar na loja. */
  receita?: "receita" | "controlado";
  /** "cesta": botão redondo com sacola e "+" no canto do cartão. "cartao": círculo + permanente no canto da foto; cada clique adiciona 1 e abre a cesta. */
  variante?: "cesta" | "cartao";
  /** Página do produto: a cesta confere a disponibilidade ao vivo por ela. */
  slug?: string;
  /** Texto do botão grande (padrão "Adicionar"). */
  rotulo?: string;
  /** Unidades que restam na loja (1 a 5): a cesta não passa disso. */
  max?: number;
};

/** Botão "+" que adiciona à cesta. Sem texto do produto no analytics. */
export default function ReservarBotao({ unitId, nome, precoCentavos, deCentavos, foto, source = "catalogo", compacto = false, receita, variante, rotulo = "Adicionar", max, slug }: Props) {
  const estado = useReserva();
  const id = idDoItem(unitId, nome);
  const qtd = qtdDoItem(estado, id);
  const teto = tetoDoItem({ max });
  const maisRef = useRef<HTMLButtonElement>(null);
  // Pulso circular do "+" do cartão: nasce do ponto clicado. A chave muda a cada clique para a animação recomeçar.
  const [pulso, setPulso] = useState<{ x: number; y: number; k: number } | null>(null);
  const [visualizacaoAberta, setVisualizacaoAberta] = useState(false);
  useEffect(() => {
    if (!pulso) return;
    const fim = window.setTimeout(() => setPulso(null), 950);
    return () => window.clearTimeout(fim);
  }, [pulso]);

  const acrescentar = (opcoes?: { abrirCesta?: boolean; gatilho?: HTMLElement | null }, quantidade = 1) => {
    // Preço 0 (ou inválido) não entra na cesta: não dispara analytics nem abre o modal.
    if (!(precoCentavos > 0)) return;
    atualizarReserva((s) => adicionar(s, { unitId, nome, precoCentavos, deCentavos, foto, ...(receita ? { receita } : {}), ...(max ? { max } : {}), ...(slug ? { slug } : {}) }, quantidade));
    trackEvent("reserva_add", { unit: unitId, source });
    registrarEtapa("add");
    if (opcoes?.abrirCesta) abrirReserva(opcoes.gatilho);
  };

  const mudar = (novo: number) => atualizarReserva((s) => definirQtd(s, id, novo));

  // Card: o círculo + abre a visualização rápida; o cliente confirma quantidade e inclusão na cesta.
  if (variante === "cartao") {
    return (
      <>
        <button
          key={pulso?.k ?? 0}
          ref={maisRef}
          type="button"
          className={pulso ? "pv-adicionar is-pulso" : "pv-adicionar"}
          style={pulso ? ({ "--pulso-x": `${pulso.x}px`, "--pulso-y": `${pulso.y}px` } as CSSProperties) : undefined}
          aria-label={`Ver detalhes de ${nome} e adicionar à cesta`}
          disabled={!(precoCentavos > 0)}
          onClick={(evento) => {
            // Clique pelo teclado (sem posição) nasce do centro do botão.
            const r = evento.currentTarget.getBoundingClientRect();
            const porTeclado = evento.clientX === 0 && evento.clientY === 0;
            setPulso({ x: porTeclado ? r.width / 2 : evento.clientX - r.left, y: porTeclado ? r.height / 2 : evento.clientY - r.top, k: Date.now() });
            setVisualizacaoAberta(true);
          }}
        ><IconMaisFino size={28} strokeWidth={2} /></button>
        <VisualizacaoRapida
          open={visualizacaoAberta}
          nome={nome}
          precoCentavos={precoCentavos}
          deCentavos={deCentavos}
          foto={foto}
          slug={slug}
          receita={receita}
          max={max}
          onClose={() => setVisualizacaoAberta(false)}
          onAdicionar={(quantidade) => acrescentar(undefined, quantidade)}
          onAbrirCesta={() => abrirReserva(maisRef.current)}
        />
      </>
    );
  }

  if (variante === "cesta") {
    if (qtd === 0) {
      return (
        <button
          ref={maisRef}
          type="button"
          className="reservar-mais pv-cesta-botao"
          aria-label={`Adicionar ${nome} à cesta`}
          onClick={() => acrescentar()}
        >
          <IconCesta size={26} />
          <span className="pv-cesta-mais" aria-hidden="true"><IconMais size={12} /></span>
        </button>
      );
    }
    return (
      <BotaoCesta compacto quantidade={qtd} teto={teto} nome={nome} aoAdicionar={() => acrescentar()} aoMudar={mudar} />
    );
  }

  return (
    <BotaoCesta
      compacto={compacto}
      rotulo={rotulo}
      quantidade={qtd}
      teto={teto}
      nome={nome}
      aoAdicionar={() => acrescentar()}
      aoMudar={mudar}
    />
  );
}

