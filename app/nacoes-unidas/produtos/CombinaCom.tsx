/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { acharPorSlug, formatBRL, slugify, type CatalogoItem } from "./catalogo";
import paresJson from "./dados/relacionados-ia.json" with { type: "json" };
import { fotoExibida } from "./foto-exibida";
import { elegivelParaPares, MIN_SUGESTOES, sugestoesDoProduto, type Pares } from "./relacionados";
import { nomeDeExibicao } from "../../nome-exibicao";

const PARES = paresJson as Pares;

/** Itens do catálogo para a seção "Combina com" de um produto. Vazio quando o item não é elegível ou há menos de 3 sugestões reais. */
export function itensCombinaCom(catalogo: readonly CatalogoItem[], item: CatalogoItem): CatalogoItem[] {
  if (!elegivelParaPares(item)) return [];
  const achados = sugestoesDoProduto(PARES, slugify(item.nome))
    .map((slug) => acharPorSlug(catalogo, slug))
    .filter((alvo): alvo is CatalogoItem => alvo !== null && elegivelParaPares(alvo) && slugify(alvo.nome) !== slugify(item.nome));
  return achados.length >= MIN_SUGESTOES ? achados : [];
}

/** "Combina com": sugestões da loja. Sem afirmar nada sobre compras de outros clientes: a loja não tem esse histórico. */
export default function CombinaCom({ itens }: { itens: readonly CatalogoItem[] }) {
  if (itens.length < MIN_SUGESTOES) return null;
  return (
    <section className="produto-secao section-inner combina-com" aria-labelledby="combina-com-titulo">
      <h2 id="combina-com-titulo">Combina com</h2>
      <p className="combina-com-nota">Sugestões da loja entre os produtos do catálogo.</p>
      <ul className="combina-com-lista">
        {itens.map((alvo) => {
          const nome = nomeDeExibicao(alvo.nome);
          const foto = fotoExibida(alvo.nome, alvo.categoria);
          return (
            <li key={alvo.nome}>
              <a href={`/nacoes-unidas/produtos/${slugify(alvo.nome)}`} className="combina-com-card">
                <span className="combina-com-foto">{foto ? <img src={foto} alt="" width="96" height="96" loading="lazy" decoding="async" /> : <span aria-hidden="true" />}</span>
                <span className="combina-com-nome">{nome}</span>
                <span className="combina-com-preco">{formatBRL(alvo.preco)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
