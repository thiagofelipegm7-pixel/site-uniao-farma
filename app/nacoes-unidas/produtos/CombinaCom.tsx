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

const MAX_RELACIONADOS = 8;

/**
 * Produtos relacionados: mesma categoria, só entre os que podem ser sugeridos (nunca medicamento), com foto e em estoque.
 * A mesma marca vem primeiro; depois, o preço mais próximo do produto da página. Sem afirmar nada sobre compras de outros clientes.
 */
export function itensRelacionados(catalogo: readonly CatalogoItem[], item: CatalogoItem, excluir: ReadonlySet<string> = new Set()): CatalogoItem[] {
  if (!elegivelParaPares(item)) return [];
  const meu = slugify(item.nome);
  const lab = item.lab.trim().toLowerCase();
  const candidatos = catalogo.filter((c) => {
    if (c.categoria !== item.categoria || c.esgotado || !elegivelParaPares(c)) return false;
    const s = slugify(c.nome);
    return s !== meu && !excluir.has(s) && Boolean(fotoExibida(c.nome, c.categoria));
  });
  const mesmaMarca = (c: CatalogoItem) => (lab !== "" && c.lab.trim().toLowerCase() === lab ? 0 : 1);
  candidatos.sort((a, b) => mesmaMarca(a) - mesmaMarca(b) || Math.abs(a.preco - item.preco) - Math.abs(b.preco - item.preco) || a.nome.localeCompare(b.nome, "pt-BR"));
  const escolhidos = candidatos.slice(0, MAX_RELACIONADOS);
  return escolhidos.length >= MIN_SUGESTOES ? escolhidos : [];
}

/** Mais da mesma marca (laboratório) em qualquer categoria sugerível, sem repetir o que já aparece em outras listas da página. */
export function itensDaMarca(catalogo: readonly CatalogoItem[], item: CatalogoItem, excluir: ReadonlySet<string> = new Set()): CatalogoItem[] {
  const lab = item.lab.trim().toLowerCase();
  if (!lab || !elegivelParaPares(item)) return [];
  const meu = slugify(item.nome);
  const candidatos = catalogo.filter((c) => {
    if (c.lab.trim().toLowerCase() !== lab || c.esgotado || !elegivelParaPares(c)) return false;
    const s = slugify(c.nome);
    return s !== meu && !excluir.has(s) && Boolean(fotoExibida(c.nome, c.categoria));
  });
  candidatos.sort((a, b) => Math.abs(a.preco - item.preco) - Math.abs(b.preco - item.preco) || a.nome.localeCompare(b.nome, "pt-BR"));
  const escolhidos = candidatos.slice(0, MAX_RELACIONADOS);
  return escolhidos.length >= MIN_SUGESTOES ? escolhidos : [];
}

function hashTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type CriterioDestaque = { categorias?: readonly string[]; precoMax?: number };

/**
 * Seleção de destaques por critério objetivo (categoria e/ou faixa de preço), só entre os produtos que podem ser sugeridos.
 * A ordem varia de uma página para outra (hash do nome do produto da página), para o carrossel não ser sempre o mesmo.
 * Não afirma nada sobre vendas ou popularidade: a loja não tem esse histórico.
 */
export function itensDestaque(catalogo: readonly CatalogoItem[], item: CatalogoItem, criterio: CriterioDestaque, excluir: ReadonlySet<string> = new Set()): CatalogoItem[] {
  const meu = slugify(item.nome);
  const candidatos = catalogo.filter((c) => {
    if (c.esgotado || !elegivelParaPares(c)) return false;
    if (criterio.categorias && !criterio.categorias.includes(c.categoria)) return false;
    if (criterio.precoMax !== undefined && !(c.preco > 0 && c.preco <= criterio.precoMax)) return false;
    const s = slugify(c.nome);
    return s !== meu && !excluir.has(s) && Boolean(fotoExibida(c.nome, c.categoria));
  });
  candidatos.sort((a, b) => hashTexto(`${meu}|${a.nome}`) - hashTexto(`${meu}|${b.nome}`));
  const escolhidos = candidatos.slice(0, MAX_RELACIONADOS);
  return escolhidos.length >= MIN_SUGESTOES ? escolhidos : [];
}

type Props = { itens: readonly CatalogoItem[]; titulo?: string; nota?: string | null; id?: string };

/** "Combina com" e "Produtos relacionados": cartões de produtos da loja num carrossel. */
export default function CombinaCom({ itens, titulo = "Combina com este produto", nota = "Sugestões da loja entre os produtos do catálogo.", id = "combina-com-titulo" }: Props) {
  if (itens.length < MIN_SUGESTOES) return null;
  return (
    <section className="produto-secao section-inner combina-com" aria-labelledby={id}>
      <h2 id={id}>{titulo}</h2>
      {nota ? <p className="combina-com-nota">{nota}</p> : null}
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
