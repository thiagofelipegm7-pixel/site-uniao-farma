/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import type { ReactNode } from "react";
import Preco from "./Preco";
import SemFoto from "./SemFoto";
import { formatarQuantidade } from "./quantidade";
import { marcaDeProduto, marcaLegivel } from "./marca";

/** Classificação do medicamento mostrada na segunda linha ("Med. Genérico", "Controlado"). Sem "com/sem receita": isso já vai nos avisos legais. Vazio para produtos comuns. */
export type ClassificacaoCartao = "generico" | "controlado";

const ROTULO_CLASSIFICACAO: Record<ClassificacaoCartao, string> = {
  generico: "Med. Genérico",
  controlado: "Controlado",
};

function Icone({ tipo }: { tipo: "quantidade" | "controlado" | "lab" | "marca" }) {
  const base = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, className: "pv-atrib-icone" };
  if (tipo === "quantidade") return <svg {...base}><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M12 12.5v4M10 14.5h4" /></svg>;
  if (tipo === "lab") return <svg {...base}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></svg>;
  if (tipo === "marca") return <svg {...base}><path d="M20 12.6 12.6 20a2 2 0 0 1-2.8 0L3 13.2V4h9.2L20 11.8a1 1 0 0 1 0 .8Z" /><circle cx="8" cy="8" r="1.3" /></svg>;
  return <svg {...base}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
}

type Props = {
  /** Sem endereço (itens sem página de produto), o corpo do cartão não é um link. */
  href?: string;
  nome: string;
  foto?: string | null;
  /** Fabricante ou marca. Aparece como "Lab. Cimed" (medicamento) ou "Marca Dove" (produto comum). Em branco quando o catálogo não tem. */
  marca?: string | null;
  /** Medicamento: a marca vira "Lab. X" em vez de "Marca X". */
  medicamento?: boolean;
  /** Segunda linha do cartão: "Med. Genérico" ou "Controlado". Só quando o dado é conhecido. */
  classificacao?: ClassificacaoCartao | null;
  /** Apresentação ("30 comprimidos"). Em branco quando o catálogo não tem. */
  apresentacao?: string | null;
  precoFmt?: string | null;
  /** Unidades que restam (1 a 5). O aviso "Resta N" está desligado (quase todo produto tem 1 ou 2); só a trava da cesta usa o dado. */
  restam?: number | null;
  /** Estoque zero: selo "Esgotado" no pé do cartão, no lugar do botão da cesta. */
  esgotado?: boolean;
  /** Botão da cesta (canto superior direito). */
  cesta?: ReactNode;
  /** Avisos legais logo abaixo do preço (medicamento isento, venda sob prescrição, NBCAL). */
  avisos?: ReactNode;
  /** Conteúdo extra abaixo do cartão (detalhes, WhatsApp). */
  extra?: ReactNode;
  /** Cartão vertical em qualquer largura (vitrines em carrossel). */
  vertical?: boolean;
  /** Atributo `data-tipo` e classe extra. */
  classe?: string;
  tipo?: string;
};

/**
 * Cartão de produto no padrão da Araujo (medido no print e no HTML salvo): vertical, imagem grande, nome em duas linhas,
 * preço e botão largo "Adicionar" no pé. Abaixo do nome, até três linhas com ícone (quantidade, "Med. Genérico" e "Lab. Cimed"), como nas farmácias grandes. Sem selo de programa, sem "De/Por" e sem % OFF quando
 * o catálogo não tem preço de antes: o que a União não tem fica em branco.
 */
export default function CartaoPanvel({ href, nome, foto, marca, medicamento = false, classificacao = null, apresentacao, precoFmt, cesta, esgotado = false, avisos, extra, vertical = false, classe = "", tipo }: Props) {
  const apresentacaoLegivel = formatarQuantidade(apresentacao);
  // Medicamento: "Lab. Cimed". Produto comum: "Marca Dove" se o nome cita a marca; senão o fabricante do cadastro ("Fab. Procter").
  const marcaDoNome = medicamento ? "" : marcaDeProduto(nome);
  const linhaMarca = medicamento ? (marca?.trim() ? `Lab. ${marcaLegivel(marca)}` : "") : marcaDoNome ? `Marca ${marcaDoNome}` : marca?.trim() ? `Fab. ${marcaLegivel(marca)}` : "";
  const corpo = (
    <>
      <span className="pv-img">{foto ? <img src={foto} alt="" width="160" height="160" loading="lazy" decoding="async" /> : <SemFoto className="pv-sem-foto" />}</span>
      <span className="pv-texto">
        <span className="pv-nome">{nome}</span>
        {apresentacaoLegivel || classificacao || linhaMarca ? (
          <span className="pv-atrib">
            {apresentacaoLegivel ? <span className="pv-atrib-linha pv-apres"><Icone tipo="quantidade" />{apresentacaoLegivel}</span> : null}
            {classificacao ? (
              <span className={`pv-atrib-linha pv-atrib-${classificacao}`}>
                {classificacao === "generico" ? <span className="pv-g" aria-hidden="true">G</span> : <Icone tipo={classificacao} />}
                {ROTULO_CLASSIFICACAO[classificacao]}
              </span>
            ) : null}
            {linhaMarca ? <span className="pv-atrib-linha pv-marca"><Icone tipo={medicamento ? "lab" : "marca"} />{linhaMarca}</span> : null}
          </span>
        ) : null}
      </span>
      <Preco precoFmt={precoFmt} />
    </>
  );
  return (
    <li className={`pv-card${vertical ? " pv-card--v" : ""}${esgotado ? " pv-card--esgotado" : ""}${classe ? ` ${classe}` : ""}`} data-tipo={tipo}>
      {href ? (
        <a className="pv-corpo" href={href} aria-label={`Ver ${nome}`}>
          {corpo}
        </a>
      ) : (
        <div className="pv-corpo">{corpo}</div>
      )}
      {avisos ? <div className="pv-avisos">{avisos}</div> : null}
      {esgotado ? <div className="pv-cesta"><span className="pv-esgotado">Esgotado</span></div> : cesta ? <div className="pv-cesta">{cesta}</div> : null}
      {extra}
    </li>
  );
}
