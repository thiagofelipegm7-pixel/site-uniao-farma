/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import type { ItemBusca } from "./busca";

const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

/**
 * Fichas de tamanho ou cor dentro do cartão único de uma lista. Cada ficha é um link para a página do produto daquele tamanho
 * (com estoque, preço e cesta próprios). Fica fora do link principal do cartão, sem link dentro de link.
 * Nome acessível com tamanho, preço e "esgotado" (A-14); esgotado também aparece riscado, não só por cor (A-04); alvo de 48 px (A-10).
 */
export default function ChipsVariacoesCartao({ variacoes, nome }: { variacoes: NonNullable<ItemBusca["variacoes"]>; nome: string }) {
  const eixo = variacoes.eixo;
  return (
    <nav className="pv-variacoes" aria-label={`Escolher ${eixo.toLocaleLowerCase("pt-BR")} de ${nome}`}>
      <ul>
        {variacoes.fichas.map((f) => (
          <li key={f.ean}>
            <a className={f.esgotado ? "pv-variacoes-ficha is-esgotado" : "pv-variacoes-ficha"} href={`/nacoes-unidas/produtos/${f.slug}`} aria-label={`${eixo} ${f.rotulo}, ${reais(f.precoCentavos)}${f.esgotado ? ", esgotado" : ""}`}>
              {f.rotulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
