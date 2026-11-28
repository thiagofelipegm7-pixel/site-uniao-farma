/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import type { FichaVariacao } from "../../variacoes-resolver";

const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

/**
 * Escolha de tamanho, cor ou outra variação do mesmo produto (ex.: fralda P, M, G, XG).
 * Cada ficha é um link para a página do produto daquele tamanho, que tem estoque e preço próprios; por isso o carrinho não muda.
 * Vem pronto no HTML do servidor (S-24). A ficha atual é marcada com aria-current e com preenchimento preto: não depende só de cor (A-04).
 * Cada link tem nome próprio com o tamanho, o preço e se está esgotado (A-14) e alvo de 48 px (A-10).
 */
export default function SeletorVariacoes({ eixo, fichas, atual }: { eixo: string; fichas: readonly FichaVariacao[]; atual: string | null }) {
  if (fichas.length < 2) return null;
  const escolhida = fichas.find((f) => f.ean === atual);
  const eixoMinusculo = eixo.toLocaleLowerCase("pt-BR");
  return (
    <nav className="seletor-variacoes" aria-label={`Escolher ${eixoMinusculo} do produto`}>
      <p className="seletor-variacoes-titulo">
        {eixo}: {escolhida ? <strong>{escolhida.rotulo}</strong> : null}
      </p>
      <ul className="seletor-variacoes-lista">
        {fichas.map((f) => {
          const aqui = f.ean === atual;
          const nome = aqui ? `${eixo} ${f.rotulo}, selecionado` : `${eixo} ${f.rotulo}, ${reais(f.precoCentavos)}${f.esgotado ? ", esgotado" : ""}`;
          return (
            <li key={f.ean}>
              <a className={aqui ? "seletor-variacoes-ficha is-atual" : "seletor-variacoes-ficha"} href={`/nacoes-unidas/produtos/${f.slug}`} aria-label={nome} aria-current={aqui ? "page" : undefined}>
                <span className="seletor-variacoes-rotulo">{f.rotulo}</span>
                {f.esgotado ? <small className="seletor-variacoes-aviso">Esgotado</small> : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
