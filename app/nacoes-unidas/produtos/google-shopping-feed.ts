import { SITE_URL } from "../../site-config";
import { nomeDeExibicao } from "../../nome-exibicao";
import { slugify, type CatalogoItem } from "./catalogo";
import { descricaoPublica } from "./descricoes";
import { eanDaFoto, fotoDoProduto } from "./imagens";
import { CATEGORIA_GOOGLE, gtinValido, itensElegiveisGoogle } from "./google-shopping";
import { XML_ENTREGA_FEED } from "../../politicas-merchant";

/**
 * Feed de produtos do Google Merchant Center (listagens gratuitas), RSS 2.0 com o namespace g:.
 * Só os itens de elegivelGoogle (não medicamento, em estoque, com foto e preço). Preço e estoque vêm do catálogo publicado,
 * sem nada inventado: o preço é o do site, que vale como preço firme nesses itens.
 */
export const FEED_GOOGLE_PATH = "/feeds/google-shopping.xml";

export type ItemFeed = {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  price: string;
  availability: "in_stock";
  condition: "new";
  brand?: string;
  gtin?: string;
  identifier_exists?: "no";
  google_product_category?: number;
};

function limpar(texto: string, max: number): string {
  const t = texto.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function escaparXml(texto: string): string {
  return texto
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** FNV-1a de 32 bits em hexadecimal (id curto e estável). */
function hashCurto(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** id do Merchant Center (até 50 caracteres), estável enquanto o nome do produto não mudar. */
export function idDoFeed(slug: string): string {
  const id = `nu-${slug}`;
  return id.length <= 50 ? id : `nu-${slug.slice(0, 38).replace(/-$/, "")}-${hashCurto(slug)}`;
}

/** Linha do feed de um item elegível. */
export function itemDoFeed(item: CatalogoItem): ItemFeed {
  const slug = slugify(item.nome);
  const titulo = nomeDeExibicao(item.nome);
  const marca = item.lab.trim();
  const foto = fotoDoProduto(item.nome)!;
  const descricao = descricaoPublica(slug, false)?.texto;
  const ean = [item.ean, eanDaFoto(item.nome)].find((c) => gtinValido(c ?? null)) ?? undefined;
  const fallback = `${titulo}${marca ? `, da marca ${marca}` : ""}. Vendido pela União Farma Nações Unidas, em Sabará (MG). Retire na loja ou receba em casa.`;
  const linha: ItemFeed = {
    id: idDoFeed(slug),
    title: limpar(titulo, 150),
    description: limpar(descricao || fallback, 5000),
    link: `${SITE_URL}/nacoes-unidas/produtos/${slug}`,
    image_link: `${SITE_URL}${foto}`,
    price: `${item.preco.toFixed(2)} BRL`,
    availability: "in_stock",
    condition: "new",
  };
  if (marca) linha.brand = limpar(marca, 70);
  if (ean) linha.gtin = ean;
  if (!marca && !ean) linha.identifier_exists = "no";
  const categoria = CATEGORIA_GOOGLE[item.categoria];
  if (categoria) linha.google_product_category = categoria;
  return linha;
}

export function itensDoFeed(itens: readonly CatalogoItem[] = itensElegiveisGoogle()): ItemFeed[] {
  const vistos = new Set<string>();
  const linhas: ItemFeed[] = [];
  for (const item of itens) {
    const linha = itemDoFeed(item);
    if (vistos.has(linha.id)) continue; // id precisa ser único no feed
    vistos.add(linha.id);
    linhas.push(linha);
  }
  return linhas;
}

const ORDEM: (keyof ItemFeed)[] = ["id", "title", "description", "link", "image_link", "price", "availability", "condition", "brand", "gtin", "identifier_exists", "google_product_category"];

export function xmlDoFeed(linhas: readonly ItemFeed[] = itensDoFeed()): string {
  const itens = linhas
    .map((linha) => {
      const campos = ORDEM.filter((k) => linha[k] !== undefined).map((k) => {
        const valor = escaparXml(String(linha[k]));
        return k === "title" || k === "description" || k === "link" ? `      <${k}>${valor}</${k}>` : `      <g:${k}>${valor}</g:${k}>`;
      });
      return `    <item>\n${campos.join("\n")}\n${XML_ENTREGA_FEED}\n    </item>`;
    })
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>União Farma Nações Unidas</title>",
    `    <link>${SITE_URL}/nacoes-unidas/produtos</link>`,
    "    <description>Produtos da União Farma Nações Unidas, em Sabará (MG). Sem medicamentos.</description>",
    itens,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

/** Tempo que o XML montado fica reutilizado neste isolate (1 hora), para não remountar ~966 itens a cada visita. */
export const FEED_CACHE_MS = 3_600_000;

let feedEmCache: { xml: string; em: number } | null = null;

/** XML do feed, refeito no máximo a cada FEED_CACHE_MS. Passe `agora` nos testes. */
export function xmlDoFeedEmCache(agora = Date.now()): string {
  if (feedEmCache && agora - feedEmCache.em < FEED_CACHE_MS) return feedEmCache.xml;
  feedEmCache = { xml: xmlDoFeed(), em: agora };
  return feedEmCache.xml;
}

/** Só para testes: esvazia o memo do feed. */
export function limparCacheDoFeed(): void {
  feedEmCache = null;
}
