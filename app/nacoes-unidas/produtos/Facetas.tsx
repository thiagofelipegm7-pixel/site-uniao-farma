"use client";

import { useState, type FormEvent } from "react";
import { IconFechar } from "../../reserva/ReservaIcons";
import { formatarReais, validarFaixa, type Faceta, type FacetaId, type FiltrosLista, type OpcaoFaceta } from "./facetas";

/** Opções que aparecem antes do "Mostrar mais". */
export const OPCOES_VISIVEIS = 6;
/** Seções abertas ao carregar (as demais abrem no clique). */
export const SECOES_ABERTAS = 4;

const Seta = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

function Secao({ id, titulo, aberta, aoAlternar, children }: { id: string; titulo: string; aberta: boolean; aoAlternar: () => void; children: React.ReactNode }) {
  return (
    <section className="fc-secao" data-aberta={aberta ? "" : undefined}>
      <h3 className="fc-secao-titulo">
        <button type="button" aria-expanded={aberta} aria-controls={id} onClick={aoAlternar}>
          <span>{titulo}</span>
          <Seta />
        </button>
      </h3>
      <div id={id} hidden={!aberta}>
        {children}
      </div>
    </section>
  );
}

function Opcoes({ faceta, prefixo, aoAlternar }: { faceta: Faceta; prefixo: string; aoAlternar: (valor: string) => void }) {
  const [todas, setTodas] = useState(false);
  const longa = faceta.opcoes.length > OPCOES_VISIVEIS + 1;
  // Marcadas sempre à vista, mesmo além das 6 primeiras.
  const mostradas: OpcaoFaceta[] = !longa || todas ? faceta.opcoes : faceta.opcoes.filter((o, i) => i < OPCOES_VISIVEIS || o.selecionada);
  const listaId = `${prefixo}-${faceta.id}-lista`;
  return (
    <fieldset className="fc-opcoes">
      <legend className="fc-sr">{faceta.titulo}</legend>
      <div id={listaId} className={todas && longa ? "fc-lista fc-lista--toda" : "fc-lista"}>
        {mostradas.map((o) => (
          <label key={o.valor} className="catalogo-filtro-opcao fc-opcao">
            <input type="checkbox" checked={o.selecionada} onChange={() => aoAlternar(o.valor)} />
            <span>
              {o.label} <span className="fc-contagem">({o.contagem.toLocaleString("pt-BR")})</span>
            </span>
          </label>
        ))}
      </div>
      {longa ? (
        <button type="button" className="fc-mais" aria-expanded={todas} aria-controls={listaId} onClick={() => setTodas((v) => !v)}>
          {todas ? "Mostrar menos" : `Mostrar mais (${faceta.opcoes.length - mostradas.length})`}
        </button>
      ) : null}
    </fieldset>
  );
}

function FaixaPreco({ prefixo, filtros, faixa, aoAplicar }: { prefixo: string; filtros: FiltrosLista; faixa: { min: number; max: number } | null; aoAplicar: (min?: number, max?: number) => void }) {
  const paraTexto = (v?: number) => (v === undefined ? "" : String(v).replace(".", ","));
  const [min, setMin] = useState(paraTexto(filtros.precoMin));
  const [max, setMax] = useState(paraTexto(filtros.precoMax));
  const [erro, setErro] = useState("");
  // Chip removido ou botão Voltar: os campos acompanham o filtro de verdade.
  const [vistos, setVistos] = useState({ min: filtros.precoMin, max: filtros.precoMax });
  if (vistos.min !== filtros.precoMin || vistos.max !== filtros.precoMax) {
    setVistos({ min: filtros.precoMin, max: filtros.precoMax });
    setMin(paraTexto(filtros.precoMin));
    setMax(paraTexto(filtros.precoMax));
    setErro("");
  }
  const erroId = `${prefixo}-preco-erro`;
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = validarFaixa(min, max);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setErro("");
    aoAplicar(r.min, r.max);
  };
  return (
    <form className="fc-preco" onSubmit={enviar} noValidate>
      <fieldset>
        <legend className="fc-sr">Preço em reais</legend>
        <div className="fc-preco-campos">
          <label>
            <span>Mínimo</span>
            <input inputMode="decimal" autoComplete="off" value={min} onChange={(e) => setMin(e.target.value)} placeholder={faixa ? formatarReais(Math.floor(faixa.min)) : "R$ 0"} aria-invalid={erro ? true : undefined} aria-describedby={erro ? erroId : undefined} />
          </label>
          <label>
            <span>Máximo</span>
            <input inputMode="decimal" autoComplete="off" value={max} onChange={(e) => setMax(e.target.value)} placeholder={faixa ? formatarReais(Math.ceil(faixa.max)) : "R$ 0"} aria-invalid={erro ? true : undefined} aria-describedby={erro ? erroId : undefined} />
          </label>
        </div>
        {erro ? <p id={erroId} className="fc-erro" role="alert">{erro}</p> : null}
        <button type="submit" className="fc-aplicar">Aplicar</button>
      </fieldset>
    </form>
  );
}

type Props = {
  /** Distingue os ids da lateral (desktop) e da gaveta (celular). */
  prefixo: string;
  facetas: readonly Faceta[];
  filtros: FiltrosLista;
  faixa: { min: number; max: number } | null;
  aoAlternar: (id: FacetaId, valor: string) => void;
  aoPreco: (min?: number, max?: number) => void;
};

/** Seções da lateral: as que a busca atual tem, cada uma abre e fecha; o preço fica depois das 3 primeiras. */
export default function Facetas({ prefixo, facetas, filtros, faixa, aoAlternar, aoPreco }: Props) {
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});
  const temPreco = faixa !== null || filtros.precoMin !== undefined || filtros.precoMax !== undefined;
  const itens: Array<{ chave: string; titulo: string; conteudo: React.ReactNode; marcada: boolean }> = facetas.map((f) => ({
    chave: f.id,
    titulo: f.titulo,
    marcada: f.opcoes.some((o) => o.selecionada),
    conteudo: <Opcoes faceta={f} prefixo={prefixo} aoAlternar={(v) => aoAlternar(f.id, v)} />,
  }));
  if (temPreco) {
    itens.splice(Math.min(3, itens.length), 0, {
      chave: "preco",
      titulo: "Preço",
      marcada: filtros.precoMin !== undefined || filtros.precoMax !== undefined,
      conteudo: <FaixaPreco prefixo={prefixo} filtros={filtros} faixa={faixa} aoAplicar={aoPreco} />,
    });
  }
  return (
    <div className="fc">
      {itens.map((s, i) => {
        const aberta = abertas[s.chave] ?? (i < SECOES_ABERTAS || s.marcada);
        return (
          <Secao key={s.chave} id={`${prefixo}-sec-${s.chave}`} titulo={s.titulo} aberta={aberta} aoAlternar={() => setAbertas((a) => ({ ...a, [s.chave]: !aberta }))}>
            {s.conteudo}
          </Secao>
        );
      })}
    </div>
  );
}

export type ChipAtivo = { chave: string; rotulo: string; remover: () => void };

/** Filtros marcados em pílulas que se removem com um toque, mais "Limpar filtros". */
export function FiltrosAtivos({ chips, aoLimpar }: { chips: readonly ChipAtivo[]; aoLimpar: () => void }) {
  if (chips.length === 0) return null;
  return (
    <div className="fc-ativos" role="group" aria-label="Filtros aplicados">
      <ul>
        {chips.map((c) => (
          <li key={c.chave}>
            <button type="button" className="fc-chip" onClick={c.remover} aria-label={`Remover filtro ${c.rotulo}`}>
              <span>{c.rotulo}</span>
              <IconFechar size={14} />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="fc-limpar" onClick={aoLimpar}>
        Limpar filtros
      </button>
    </div>
  );
}

/** "Refine sua busca": categorias com mais produtos entre os resultados. Um toque marca a categoria. */
export function AtalhosBusca({ opcoes, aoEscolher }: { opcoes: readonly OpcaoFaceta[]; aoEscolher: (valor: string) => void }) {
  const [todas, setTodas] = useState(false);
  if (opcoes.length < 2) return null;
  const visiveis = todas ? opcoes : opcoes.slice(0, 4);
  return (
    <div className="fc-atalhos" role="group" aria-label="Refine sua busca">
      {visiveis.map((o) => (
        <button key={o.valor} type="button" className="fc-atalho" onClick={() => aoEscolher(o.valor)}>
          {o.label}
        </button>
      ))}
      {opcoes.length > 4 ? (
        <button type="button" className="fc-atalho fc-atalho--mais" aria-expanded={todas} onClick={() => setTodas((v) => !v)}>
          {todas ? "Mostrar menos" : "Mostrar mais"}
        </button>
      ) : null}
    </div>
  );
}
