import { idadeEmMinutos, MINUTOS_PARA_AVISAR, NIVEL_MAXIMO, nivelDeEstoque, nivelPublicado } from "./disponibilidade";
import { lojaDoBairro } from "./entrega-bairro";
import { banco, lerEstoqueAtual } from "./estoque-fonte";
import { normalizarBusca, sinonimosDe } from "./nacoes-unidas/produtos/busca";
import { carregarCatalogoCompleto, slugify } from "./nacoes-unidas/produtos/catalogo";
import { departamentosPublicos } from "./nacoes-unidas/produtos/departamentos";
import { fotoDoProduto } from "./nacoes-unidas/produtos/imagens";
import { AVISO_MIP, AVISO_NBCAL, ehNbcal } from "./nacoes-unidas/produtos/produto";
import { formatarQuantidade, quantidadeDoNome, quantidadeLegivel } from "./nacoes-unidas/produtos/quantidade";
import { carregarRestritos } from "./nacoes-unidas/produtos/receita";
import { nomeDeExibicao } from "./nome-exibicao";
import { tetoDoItem } from "./reserva/reserva-store";
import { PUBLIC_UNITS } from "./site-config";

export const unidadeAndroid = PUBLIC_UNITS.find((unit) => unit.id === "nacoes");

const SLUGS_DEPARTAMENTOS = new Set(departamentosPublicos().map((d) => d.slug));

/** Mesma regra da página /departamentos/<slug>: a categoria do produto, em slug, precisa bater com um departamento público. */
function departamentoDoProduto(categoria: string): string | null {
  const slug = slugify(categoria);
  return SLUGS_DEPARTAMENTOS.has(slug) ? slug : null;
}

export function departamentosAndroid() {
  return departamentosPublicos().map((d) => ({ slug: d.slug, nome: d.nome }));
}

type ConsultaD1 = { prepare: (sql: string) => { bind: (...v: unknown[]) => { all: <T>() => Promise<{ results: T[] }> } } };

/** Banners da home na ordem das vagas (hero-1, hero-2...). Só arquivos da própria loja, nunca data URI. */
export async function bannersAndroid(): Promise<{ id: string; url: string }[]> {
  const db = banco() as ConsultaD1 | null;
  if (!db) return [];
  try {
    const artes = await db.prepare("SELECT intent as id, source as url FROM metric_hits WHERE stage = ?").bind("banner").all<{ id: string; url: string }>();
    const numero = (id: string) => Number(id.replace(/\D/g, "")) || 0;
    return (artes.results ?? [])
      .filter((b) => typeof b.url === "string" && b.url.startsWith("/banners-"))
      .map((b) => ({ id: b.id, url: b.url }))
      .sort((a, b) => numero(a.id) - numero(b.id));
  } catch {
    return [];
  }
}

function montarProduto(item: { nome: string; lab: string; preco: number | null; esgotado?: boolean; restam?: number }, extras: {
  categoria: string;
  apresentacao: string | null;
  receita?: "receita" | "controlado";
  aviso?: string;
}) {
  const nome = nomeDeExibicao(item.nome);
  return {
    // O nome bruto distingue variantes que compartilham o mesmo slug no site.
    id: item.nome,
    nome,
    marca: item.lab,
    foto: extras.receita ? null : fotoDoProduto(item.nome),
    precoCentavos: item.preco === null ? null : Math.round(item.preco * 100),
    busca: normalizarBusca(`${nome} ${item.nome} ${item.lab} ${extras.categoria} ${sinonimosDe(item.nome)}`),
    nivel: nivelPublicado(item),
    departamento: departamentoDoProduto(extras.categoria),
    ...extras,
  };
}

function catalogoPublicado() {
  const { itens } = carregarCatalogoCompleto();
  const restritos = carregarRestritos();
  const produtos = [
    ...itens.map((item) => montarProduto(item, {
      categoria: item.categoria,
      apresentacao: formatarQuantidade(quantidadeDoNome(item.nome)),
      aviso: ehNbcal(item.nome) ? AVISO_NBCAL : item.isMIP ? AVISO_MIP : undefined,
    })),
    ...[...restritos.receita, ...restritos.controlados].map((item) => montarProduto(item, {
      categoria: "Medicamentos",
      apresentacao: formatarQuantidade(quantidadeLegivel(item.apresentacao)) ?? item.apresentacao,
      receita: item.controlado ? "controlado" : "receita",
      aviso: item.aviso,
    })),
  ];
  return [...new Map(produtos.map((produto) => [produto.id, produto])).values()];
}

let base: ReturnType<typeof catalogoPublicado> | undefined;
let ultimaConsulta: { quando: number; resultado: ReturnType<typeof lerEstoqueAtual> } | undefined;

export async function catalogoAndroid() {
  base ??= catalogoPublicado();
  if (!ultimaConsulta || Date.now() - ultimaConsulta.quando >= 30_000) {
    ultimaConsulta = { quando: Date.now(), resultado: lerEstoqueAtual() };
  }
  const estoque = await ultimaConsulta.resultado;
  const idade = idadeEmMinutos(estoque?.contatoEm);
  const niveis = new Map<string, number>();
  if (estoque && idade !== null && idade < MINUTOS_PARA_AVISAR) {
    for (const item of estoque.itens) niveis.set(item.nome, nivelDeEstoque(item.estoque));
  }
  return base.map((produto) => {
    const vivo = niveis.get(produto.id);
    const nivel = vivo ?? produto.nivel;
    return {
      ...produto,
      nivel,
      fonteEstoque: vivo === undefined ? "publicado" : "atualizado",
      limite: nivel === 0 || !produto.precoCentavos ? 0 : tetoDoItem({ max: nivel < NIVEL_MAXIMO ? nivel : undefined }),
    };
  });
}

export function bairrosAndroid() {
  return (unidadeAndroid?.deliveryAreas ?? []).filter((bairro) => lojaDoBairro(PUBLIC_UNITS, bairro)?.id === unidadeAndroid?.id);
}
