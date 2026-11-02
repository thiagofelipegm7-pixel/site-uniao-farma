/** Filtro local do catálogo de produtos (sem rede): ignora acento e caixa, todos os termos precisam aparecer. */
export type ItemBusca = { nome: string; lab: string; precoFmt: string; isMIP: boolean; foto: string | null };
export type GrupoBusca = { categoria: string; id: string; itens: ItemBusca[] };

export function normalizarBusca(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function combina(termos: string[], ...campos: string[]): boolean {
  const alvo = normalizarBusca(campos.join(" "));
  return termos.every((termo) => alvo.includes(termo));
}

/** Sem termo devolve tudo. Com termo, procura em nome, laboratório e categoria; grupos sem resultado somem. */
export function filtrarGrupos(grupos: GrupoBusca[], consulta: string): GrupoBusca[] {
  const termos = normalizarBusca(consulta).split(" ").filter(Boolean);
  if (termos.length === 0) return grupos;
  return grupos
    .map((grupo) => ({ ...grupo, itens: grupo.itens.filter((item) => combina(termos, item.nome, item.lab, grupo.categoria)) }))
    .filter((grupo) => grupo.itens.length > 0);
}

export function contarItens(grupos: GrupoBusca[]): number {
  return grupos.reduce((total, grupo) => total + grupo.itens.length, 0);
}

/** Mensagem pronta do WhatsApp para um item da lista: pede confirmação do dia, sem prometer estoque. */
export function mensagemItem(nome: string, precoFmt: string): string {
  const limpo = nome.replace(/\s+/g, " ").trim();
  return `Oi, União Farma Nações Unidas! Vi "${limpo}" (${precoFmt}) na lista do site. Pode confirmar preço e disponibilidade?`;
}
