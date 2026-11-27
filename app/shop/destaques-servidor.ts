/**
 * Dados da home montados no servidor, para irem no HTML (S-24 de SEO-IA.md: o conteúdo principal não pode depender de JavaScript)
 * e para a página não mudar de altura quando os produtos chegam (S-25, CLS).
 * As rotas `/api/destaques`, `/api/ofertas-vitrine` e `/api/banners-publico` usam as mesmas funções (uma só regra de escolha).
 * Só servidor: lê o catálogo, os arquivos de dados e o banco D1.
 */
import { nomeDeExibicao } from "../nome-exibicao";
import { carregarCatalogoNacoes, slugify } from "../nacoes-unidas/produtos/catalogo";
import { fotoDoProduto } from "../nacoes-unidas/produtos/imagens";
import { ehNbcal } from "../nacoes-unidas/produtos/produto";
import { descricaoDoProduto } from "../nacoes-unidas/produtos/descricoes";
import { escolherAtrativos } from "../nacoes-unidas/produtos/atrativos";
import { chaveDeNome } from "../fotos-painel";
import { banco } from "../estoque-fonte";
import { carregarPedidosDaSemana, carregarSinais, elegivelMaisPedidosSemana, faixaSeSuficiente, MIN_ITENS, ordenarPorConversao, ordenarPorPedidosDaSemana, pareceMedicamento, SINAIS_VAZIOS } from "../nacoes-unidas/produtos/mais-pedidos";
import { elegivelParaPares } from "../nacoes-unidas/produtos/relacionados";
import mudancasJson from "../nacoes-unidas/produtos/dados/mudancas-recentes.json" with { type: "json" };
import { OFERTAS_HOME } from "./ofertas-config";
import { destinoBanner, type BannerPainel } from "./painel-banners";
import { VITRINES_HOME } from "./home-vitrines";

export type ItemDestaque = { nome: string; slug: string; lab?: string; precoCentavos: number; foto: string | null; isMIP?: boolean; novo?: boolean };
export type ItemChip = { nome: string; slug: string; foto: string };
export type ItemOferta = {
  nome: string;
  slug: string;
  lab?: string;
  precoCentavos: number;
  precoAnteriorCentavos?: number;
  descontoPct?: number;
  foto: string;
  isMIP?: boolean;
  restam?: number;
};

export type ConsultaDestaques = {
  grupo?: string;
  /** Marca, igual sem diferenciar caixa. */
  lab?: string;
  /** Preço máximo em centavos. */
  ate?: number;
  /** 1 a 36. */
  n?: number;
  /** Só itens com foto. */
  fotos?: boolean;
  ordem?: string;
  /** Produtos pedidos pelo endereço ("Visto recentemente"): lista da pessoa, sem cache. */
  slugs?: string[];
};

type EventoCatalogo = { q?: string; t?: string; n?: string };

function nomesNovosRecentes(agora = Date.now()): Set<string> {
  const eventos = (mudancasJson as { eventos?: EventoCatalogo[] }).eventos ?? [];
  const desde = agora - 7 * 24 * 60 * 60 * 1000;
  return new Set(eventos
    .filter((evento) => evento.t === "novo" && typeof evento.n === "string" && Date.parse(evento.q ?? "") >= desde)
    .map((evento) => chaveDeNome(evento.n!)));
}

/**
 * Escolhe os produtos de uma vitrine. Regras (as mesmas de sempre da rota `/api/destaques`):
 * categoria, marca, preço máximo, só com foto; escolha por atrativos com variação diária; `ordem: "conversao"` ("Mais pedidos": só com
 * pedido ou clique real, em estoque, nunca remédio); `ordem: "pedidos-semana"` (chips); `ordem: "catalogo"`; `slugs` (visto recentemente).
 * `semCache` fica verdadeiro quando o resultado é da pessoa (slugs).
 */
export async function selecionarDestaques(q: ConsultaDestaques): Promise<{ itens: ItemDestaque[]; semCache: boolean }> {
  const grupo = (q.grupo ?? "").slice(0, 80);
  const lab = (q.lab ?? "").slice(0, 80).trim().toLowerCase();
  const ate = Math.floor(Number(q.ate)) || 0;
  const soComFoto = q.fotos === true;
  const n = Math.min(36, Math.max(1, Math.floor(Number(q.n)) || 6));
  const novos = nomesNovosRecentes();
  const catalogo = carregarCatalogoNacoes();
  const pedidos = (q.slugs ?? []).map((x) => x.trim()).filter((x) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x) && x.length <= 120).slice(0, 10);
  if (pedidos.length > 0) {
    const porSlug = new Map((catalogo?.itens ?? []).map((item) => [slugify(item.nome), item]));
    const itensPedidos = pedidos.flatMap((slug) => {
      const item = porSlug.get(slug);
      if (!item || ehNbcal(item.nome) || item.isMIP || item.categoria === "Medicamentos") return [];
      const foto = fotoDoProduto(item.nome);
      if (!foto) return [];
      return [{ nome: nomeDeExibicao(item.nome), slug, lab: item.lab, precoCentavos: Math.round(item.preco * 100), foto }];
    });
    return { itens: itensPedidos, semCache: true };
  }
  const dia = new Date().toISOString().slice(0, 10);
  const filtrados = (catalogo?.itens ?? [])
    .filter((item) => !ehNbcal(item.nome)) // NBCAL: sem vitrine nem destaque
    .filter((item) => !grupo || slugify(item.categoria) === grupo)
    .filter((item) => !lab || item.lab.replace(/\s+/g, " ").trim().toLowerCase() === lab)
    .filter((item) => !ate || Math.round(item.preco * 100) <= ate)
    .map((item) => {
      const slug = slugify(item.nome);
      const descricao = descricaoDoProduto(slug);
      return {
        nome: nomeDeExibicao(item.nome),
        nomeOriginal: item.nome,
        slug,
        lab: item.lab,
        precoCentavos: Math.round(item.preco * 100),
        foto: fotoDoProduto(item.nome),
        ...(typeof item.restam === "number" && item.restam > 0 ? { restam: item.restam } : {}),
        isMIP: item.isMIP,
        categoria: item.categoria,
        esgotado: item.esgotado === true,
        novo: novos.has(chaveDeNome(item.nome)),
        descricaoReal: descricao !== null && descricao.origem !== "modelo",
      };
    })
    .filter((item) => !soComFoto || item.foto !== null);
  if (q.ordem === "conversao") {
    const db = banco();
    const sinais = db ? await carregarSinais(db, dia) : SINAIS_VAZIOS;
    const vendaveis = filtrados.filter((item) => item.foto !== null && !item.esgotado && !pareceMedicamento(item.nomeOriginal) && elegivelParaPares({ nome: item.nomeOriginal, categoria: item.categoria, isMIP: item.isMIP }));
    const top = ordenarPorConversao(vendaveis, sinais, n).map(({ nome, slug, lab: marca, precoCentavos, foto }) => ({ nome, slug, lab: marca, precoCentavos, foto }));
    return { itens: top, semCache: false };
  }
  if (q.ordem === "pedidos-semana") {
    const db = banco();
    const pedidosSemana = db ? await carregarPedidosDaSemana(db, dia) : new Map<string, number>();
    const vendaveis = filtrados.filter((item) => item.foto !== null && elegivelMaisPedidosSemana({ nome: item.nome, nomeOriginal: item.nomeOriginal, categoria: item.categoria, isMIP: item.isMIP, esgotado: item.esgotado }));
    const top = faixaSeSuficiente(ordenarPorPedidosDaSemana(vendaveis, pedidosSemana, n)).map(({ nome, slug, lab: marca, precoCentavos, foto }) => ({ nome, slug, lab: marca, precoCentavos, foto }));
    return { itens: top, semCache: false };
  }
  const ordenados = q.ordem === "catalogo"
    ? [...filtrados].sort((a, b) => Number(b.foto !== null) - Number(a.foto !== null)).slice(0, n)
    : escolherAtrativos(filtrados, n, dia, grupo === "medicamentos");
  const itens = ordenados.map(({ nome, slug, lab: marca, precoCentavos, foto, isMIP, novo }) => ({ nome, slug, lab: marca, precoCentavos, foto, ...(isMIP ? { isMIP: true } : {}), ...(novo ? { novo: true } : {}) }));
  return { itens, semCache: false };
}

/** Vitrines da home já escolhidas, na ordem da página e sem repetir produto entre elas (mesma regra que o navegador aplicava). */
export async function vitrinesDaHome(): Promise<Record<string, ItemDestaque[]>> {
  const usados = new Set<string>();
  const saida: Record<string, ItemDestaque[]> = {};
  for (const v of VITRINES_HOME) {
    const { itens } = await selecionarDestaques({ grupo: v.grupo, lab: v.lab, ate: v.ate, n: Math.min(36, v.n * 3), fotos: true, ordem: v.ordem });
    const livres = itens.filter((item) => !usados.has(item.slug)).slice(0, v.n);
    if (livres.length >= (v.minimo ?? 1)) {
      saida[v.id] = livres;
      for (const item of livres) usados.add(item.slug);
    } else {
      saida[v.id] = [];
    }
  }
  return saida;
}

/** Chips "Mais pedidos da semana": só pedido real dos últimos 7 dias; com menos de 4 itens a faixa some. */
export async function chipsDaHome(): Promise<ItemChip[]> {
  const { itens } = await selecionarDestaques({ n: 12, fotos: true, ordem: "pedidos-semana" });
  const lista = itens.filter((item): item is ItemDestaque & { foto: string } => !!(item && item.slug && item.nome && item.foto)).map(({ nome, slug, foto }) => ({ nome, slug, foto }));
  return lista.length >= MIN_ITENS ? lista : [];
}

/** Ofertas fixas da home com o preço do dia (do catálogo). */
export function ofertasDaHome(): ItemOferta[] {
  const catalogo = carregarCatalogoNacoes();
  const porNome = new Map((catalogo?.itens ?? []).map((item) => [chaveDeNome(item.nome), item]));
  return OFERTAS_HOME.flatMap((oferta) => {
    const item = porNome.get(chaveDeNome(oferta.nomeCatalogo));
    if (!item || item.esgotado) return [];

    const foto = fotoDoProduto(item.nome);
    if (!foto) return [];

    const precoCentavos = Math.round(item.preco * 100);
    const precoAnteriorCentavos = "precoAnteriorCentavos" in oferta && precoCentavos < oferta.precoAnteriorCentavos
      ? oferta.precoAnteriorCentavos
      : undefined;
    const descontoPct = precoAnteriorCentavos
      ? Math.round((1 - precoCentavos / precoAnteriorCentavos) * 100)
      : undefined;

    return [{
      nome: nomeDeExibicao(item.nome),
      slug: slugify(item.nome),
      lab: item.lab,
      precoCentavos,
      foto,
      isMIP: item.isMIP,
      ...(typeof item.restam === "number" && item.restam > 0 ? { restam: item.restam } : {}),
      ...(precoAnteriorCentavos ? { precoAnteriorCentavos, descontoPct } : {}),
    }];
  });
}

type Consulta = { prepare: (sql: string) => { bind: (...v: unknown[]) => { all: <T>() => Promise<{ results: T[] }> } } };
export type BannerPublico = { id: string; url: string; slug: string | null; busca: string | null };

/** Arte de cada vaga + destino (o mais recente de cada vaga): termo de busca e/ou slug do produto. Falha vira lista vazia. */
export async function bannersPublicos(): Promise<BannerPublico[]> {
  const db = banco() as Consulta | null;
  if (!db) return [];
  try {
    const artes = await db.prepare("SELECT intent as id, source as url FROM metric_hits WHERE stage = ?").bind("banner").all<{ id: string; url: string }>();
    const destinos = await db.prepare("SELECT intent as id, source as slug FROM metric_hits WHERE stage = ? ORDER BY id").bind("banner-link").all<{ id: string; slug: string }>();
    const slugPorVaga = new Map<string, string>();
    for (const d of destinos.results ?? []) slugPorVaga.set(d.id, d.slug);
    // Termo de busca de cada vaga (painel interno). Se a consulta falhar, os banners continuam saindo, só sem termo.
    const buscaPorVaga = new Map<string, string>();
    try {
      const buscas = await db.prepare("SELECT intent as id, source as busca FROM metric_hits WHERE stage = ? ORDER BY id").bind("banner-busca").all<{ id: string; busca: string }>();
      for (const d of buscas.results ?? []) buscaPorVaga.set(d.id, d.busca);
    } catch {
      // sem termo
    }
    return (artes.results ?? []).map((b) => ({ id: b.id, url: b.url, slug: slugPorVaga.get(b.id) ?? null, busca: buscaPorVaga.get(b.id) ?? null }));
  } catch {
    return [];
  }
}

/** Banners prontos para o painel (só as vagas "hero-N", em ordem), com o destino de cada clique. */
export function bannersParaPainel(lista: ReadonlyArray<{ id: string; url: string; slug?: string | null; busca?: string | null }>): BannerPainel[] {
  return lista
    .filter((b) => b.id.startsWith("hero-"))
    .sort((a, b) => (Number(a.id.replace("hero-", "")) || 0) - (Number(b.id.replace("hero-", "")) || 0))
    .map((b) => {
      const destino = destinoBanner(b);
      return { id: b.id, imagem: b.url, alt: destino.rotulo || "Oferta da União Farma", href: destino.href, rotulo: destino.rotulo };
    });
}

/** Item no formato da lista da loja (`ItemBusca`), para a amostra que vai no HTML. */
export type ItemAmostraLoja = { nome: string; lab: string; precoFmt: string; preco: number; isMIP: boolean; foto: string | null; id: string; slug: string };

/**
 * Amostra da lista "Todos os produtos" para o HTML do servidor: a primeira página (24) com foto, em estoque e sem repetir marca demais.
 * A lista completa continua vindo do navegador (filtros, busca, ordem); a amostra ocupa o lugar do esqueleto até lá, então quem não
 * roda JavaScript (robôs de IA) vê produtos de verdade e a página não pula na troca (altura igual à de uma página de 24).
 */
export async function amostraDaLoja(n = 24): Promise<ItemAmostraLoja[]> {
  const { itens } = await selecionarDestaques({ n, fotos: true });
  return itens.map((item) => ({
    nome: item.nome,
    lab: item.lab ?? "",
    precoFmt: `R$ ${(item.precoCentavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    preco: item.precoCentavos / 100,
    isMIP: item.isMIP === true,
    foto: item.foto,
    id: item.slug,
    slug: item.slug,
  }));
}

/** Acima disto (caracteres) a "imagem" é arte embutida (data URL): não vai no HTML. */
const LIMITE_URL_BANNER = 2048;

/**
 * Só vai no HTML banner cuja arte é um arquivo (endereço curto). A arte enviada pelo painel chega como data URL (centenas de KB cada;
 * 14 vagas passam de 1 MB): dentro do HTML ela pesaria megabytes em TODAS as páginas (duas vezes, com o payload do React) e pioraria
 * LCP e TTFB. Se qualquer banner for pesado, devolve `undefined` e o painel busca no navegador, como antes.
 */
export function bannersLeves(lista: BannerPainel[]): BannerPainel[] | undefined {
  const pesado = lista.some((b) => !!b.imagem && (b.imagem.startsWith("data:") || b.imagem.length > LIMITE_URL_BANNER));
  return pesado ? undefined : lista;
}

/** Banners prontos para o painel, ou `undefined` se falhar ou forem pesados (o painel então busca no navegador, como antes). */
export async function bannersDoServidor(): Promise<BannerPainel[] | undefined> {
  try {
    // Antes de trazer a arte, o banco conta quantas passam do limite (sem transferir as imagens): se houver, nem lê (cada página ficaria 1 MB mais lenta).
    const db = banco() as Consulta | null;
    if (!db) return undefined;
    const pesados = await db.prepare("SELECT COUNT(*) AS n FROM metric_hits WHERE stage = ? AND length(source) > ?").bind("banner", LIMITE_URL_BANNER).all<{ n: number }>();
    if ((pesados.results?.[0]?.n ?? 0) > 0) return undefined;
    return bannersLeves(bannersParaPainel(await bannersPublicos()));
  } catch {
    return undefined;
  }
}

export type DadosDaHome = {
  vitrines: Record<string, ItemDestaque[]>;
  chips: ItemChip[];
  ofertas: ItemOferta[];
  banners: BannerPainel[];
};

/**
 * Tudo que a home precisa para sair completa no HTML. Qualquer falha em uma parte devolve a parte vazia (e o componente cai no
 * comportamento antigo: buscar no navegador); a página nunca quebra por causa disso.
 */
export async function dadosDaHome(): Promise<Partial<DadosDaHome>> {
  const [vitrines, chips, banners] = await Promise.all([
    vitrinesDaHome().catch(() => undefined),
    chipsDaHome().catch(() => undefined),
    bannersDoServidor(),
  ]);
  let ofertas: ItemOferta[] | undefined;
  try {
    ofertas = ofertasDaHome();
  } catch {
    ofertas = undefined;
  }
  return { vitrines, chips, ofertas, banners };
}
