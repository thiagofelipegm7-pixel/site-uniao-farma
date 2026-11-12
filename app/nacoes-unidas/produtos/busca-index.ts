/**
 * Índice único da busca da página de produtos (public/dados/nacoes/busca-index.json, gerado por scripts/gerar-assets-catalogo.mjs).
 * Uma requisição pequena no lugar de todas as fatias do catálogo, da receita e dos controlados.
 * A lista resultante é a mesma que a soma das fatias dava: mesmos grupos, mesma ordem, mesmos campos.
 */
import type { GrupoBusca, ItemBusca } from "./busca";
import type { ItemRestrito } from "./receita";

export const URL_BUSCA_INDEX = "/dados/nacoes/busca-index.json";

/** Cartão sem receita, como nas fatias (`catalogo/<slug>/pN.json`), sem os campos que a lista não usa. */
export type ItemIndice = {
  nomeExibicao?: string;
  nome?: string;
  lab: string;
  tipo?: string;
  preco: number;
  precoFmt: string;
  isMIP: boolean;
  restam?: number;
  esgotado?: boolean;
  slug?: string;
  foto: string | null;
};

/** Medicamento com receita ou controlado, só com o que o cartão restrito e a ilustração da caixa leem. */
export type RestritoIndice = Omit<ItemRestrito, "rms" | "concentracao" | "busca"> & Partial<Pick<ItemRestrito, "rms" | "concentracao" | "busca">>;

export type BuscaIndice = {
  geradoEm?: string;
  grupos: { categoria: string; slug: string; itens: ItemIndice[] }[];
  restritos: RestritoIndice[];
};

/** Mesma conversão que a lista fazia com cada item das fatias. */
export function itemDaPagina(item: ItemIndice): ItemBusca {
  return {
    nome: item.nomeExibicao || item.nome || "",
    lab: item.lab,
    isMIP: item.isMIP,
    restam: item.restam,
    esgotado: item.esgotado,
    precoFmt: item.precoFmt,
    preco: item.preco,
    foto: item.foto,
    slug: item.slug,
    tipo: item.tipo,
  };
}

/** Grupo "Medicamentos" com receita e controlados (cartão e cesta próprios), na ordem que a lista sempre usou. */
export function grupoRestritos(lista: readonly RestritoIndice[]): GrupoBusca {
  const restritos: ItemRestrito[] = lista.map((i) => ({ rms: null, concentracao: null, ...i }));
  restritos.sort((a, b) => Number(a.esgotado === true) - Number(b.esgotado === true) || (a.nomeExibicao ?? a.nome).localeCompare(b.nomeExibicao ?? b.nome, "pt-BR"));
  return {
    categoria: "Medicamentos",
    id: "restritos",
    itens: restritos.map((i) => ({
      nome: i.nomeExibicao ?? i.nome,
      lab: i.lab,
      isMIP: false,
      precoFmt: typeof i.preco === "number" ? `R$ ${i.preco.toFixed(2).replace(".", ",")}` : "Consulte",
      ...(typeof i.preco === "number" ? { preco: i.preco } : {}),
      foto: null,
      slug: i.slug,
      ...(i.esgotado ? { esgotado: true } : {}),
      restrito: i,
    })),
  };
}

/** Grupos da lista a partir do índice. Com departamento, só aquela categoria (e sem os restritos, como antes). */
export function gruposDoIndice(indice: BuscaIndice, departamento?: string): GrupoBusca[] {
  const grupos: GrupoBusca[] = (indice.grupos || [])
    .filter((g) => !departamento || g.slug === departamento)
    .map((g) => ({ categoria: g.categoria, id: g.slug, itens: g.itens.map(itemDaPagina) }));
  if (!departamento && Array.isArray(indice.restritos)) grupos.push(grupoRestritos(indice.restritos));
  return grupos;
}

export function indiceValido(dados: unknown): dados is BuscaIndice {
  if (!dados || typeof dados !== "object") return false;
  const d = dados as Partial<BuscaIndice>;
  return Array.isArray(d.grupos) && Array.isArray(d.restritos) && d.grupos.every((g) => g && typeof g.categoria === "string" && Array.isArray(g.itens));
}

let indiceEmMemoria: Promise<BuscaIndice> | null = null;

/**
 * Baixa o índice uma vez por página (a mesma promessa serve a quem pedir de novo). O navegador também guarda o arquivo
 * (cache HTTP com ETag). Se falhar, a próxima chamada tenta de novo.
 */
export function carregarBuscaIndex(): Promise<BuscaIndice> {
  if (!indiceEmMemoria) {
    indiceEmMemoria = fetch(URL_BUSCA_INDEX, { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`busca-index ${r.status}`))))
      .then((dados: unknown) => {
        if (!indiceValido(dados)) throw new Error("busca-index inválido");
        return dados;
      })
      .catch((erro: unknown) => {
        indiceEmMemoria = null;
        throw erro;
      });
  }
  return indiceEmMemoria;
}

export type EstadoLista = "carregando" | "procurando" | "vazio" | "lista";

/**
 * O que a lista mostra. Sem busca, o que já chegou aparece aos poucos. Nunca "não encontramos" (nem "0 produtos") antes de o catálogo inteiro chegar,
 * nem enquanto a correção de digitação ainda procura o que o cliente quis dizer.
 */
export function estadoDaLista({ completo, total, procurando, buscando = false }: { completo: boolean; total: number; procurando: boolean; buscando?: boolean }): EstadoLista {
  // Com busca, espera o catálogo inteiro: a contagem não fica pulando de "2" para "5" enquanto chegam mais itens.
  if (!completo && (buscando || total === 0)) return "carregando";
  if (total > 0) return "lista";
  if (procurando) return "procurando";
  return "vazio";
}
