/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import type { ReactNode } from "react";
import Preco from "./Preco";
import SemFoto from "./SemFoto";
import { formatarQuantidade } from "./quantidade";

type Props = {
  /** Sem endereço (itens sem página de produto), o corpo do cartão não é um link. */
  href?: string;
  nome: string;
  foto?: string | null;
  /** Fabricante ou marca (fica em maiúsculas). Em branco quando o catálogo não tem. */
  marca?: string | null;
  /** Apresentação ("30 comprimidos"). Em branco quando o catálogo não tem. */
  apresentacao?: string | null;
  precoFmt?: string | null;
  /** Unidades que restam (1 a 5). O aviso "Resta N" está desligado (quase todo produto tem 1 ou 2); só a trava da cesta usa o dado. */
  restam?: number | null;
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
 * Cartão de produto no padrão da listagem da Panvel (medido no cards.htm salvo): cesta redonda no canto, imagem,
 * nome, marca, apresentação e preço com o inteiro em destaque. Sem selo de programa, sem "De/Por" e sem % OFF quando
 * o catálogo não tem preço de antes: o que a União não tem fica em branco.
 */
export default function CartaoPanvel({ href, nome, foto, marca, apresentacao, precoFmt, cesta, avisos, extra, vertical = false, classe = "", tipo }: Props) {
  const apresentacaoLegivel = formatarQuantidade(apresentacao);
  const corpo = (
    <>
      <span className="pv-img">{foto ? <img src={foto} alt="" width="160" height="160" loading="lazy" decoding="async" /> : <SemFoto className="pv-sem-foto" />}</span>
      <span className="pv-texto">
        <span className="pv-nome">{nome}</span>
        {marca?.trim() ? <span className="pv-marca">{marca.trim()}</span> : null}
        {apresentacaoLegivel ? <span className="pv-apres">{apresentacaoLegivel}</span> : null}
      </span>
      <Preco precoFmt={precoFmt} />
    </>
  );
  return (
    <li className={`pv-card${vertical ? " pv-card--v" : ""}${classe ? ` ${classe}` : ""}`} data-tipo={tipo}>
      {cesta ? <div className="pv-cesta">{cesta}</div> : null}
      {href ? (
        <a className="pv-corpo" href={href} aria-label={`Ver ${nome}`}>
          {corpo}
        </a>
      ) : (
        <div className="pv-corpo">{corpo}</div>
      )}
      {avisos ? <div className="pv-avisos">{avisos}</div> : null}
      {extra}
    </li>
  );
}
