/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
import { formatBRL, slugify, type CatalogoItem } from "./catalogo";
import { fotoExibida } from "./foto-exibida";
import { nomeDeExibicao } from "../../nome-exibicao";
import { MIN_KIT } from "./completa-kit";

export { itensCompletaKit, MIN_KIT, MAX_KIT } from "./completa-kit";

/** Tira leve perto do botão de adicionar: foto pequena, nome e só o preço do dia. */
export default function CompletaKit({ itens }: { itens: readonly CatalogoItem[] }) {
  if (itens.length < MIN_KIT) return null;
  return (
    <section className="completa-kit" aria-labelledby="completa-kit-titulo">
      <h2 id="completa-kit-titulo">Complete o kit</h2>
      <ul className="completa-kit-lista">
        {itens.map((alvo) => {
          const nome = nomeDeExibicao(alvo.nome);
          const foto = fotoExibida(alvo.nome, alvo.categoria);
          return (
            <li key={alvo.nome}>
              <a href={`/nacoes-unidas/produtos/${slugify(alvo.nome)}`} className="completa-kit-item">
                <span className="completa-kit-foto">{foto ? <img src={foto} alt="" width="48" height="48" loading="lazy" decoding="async" /> : null}</span>
                <span className="completa-kit-nome">{nome}</span>
                <span className="completa-kit-preco">{formatBRL(alvo.preco)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
