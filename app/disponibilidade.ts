/**
 * Disponibilidade ao vivo: o catálogo do site é publicado em lote (estático). Para a cesta não vender o que já acabou,
 * o servidor compara o estoque de agora (enviado pelo PC da loja a cada ~10 min) com o publicado e devolve só o que mudou.
 * Módulo puro (sem rede nem Cloudflare). Nunca expõe a quantidade exata: 0 = acabou, 1 a 5 = restam, 6 = seis ou mais.
 */
export const NIVEL_MAXIMO = 6;

/** slug do produto -> nível (0 acabou, 1 a 5 restam, 6 seis ou mais). */
export type Mudancas = Record<string, number>;

export function nivelDeEstoque(estoque: number): number {
  if (!Number.isFinite(estoque) || estoque <= 0) return 0;
  return estoque >= NIVEL_MAXIMO ? NIVEL_MAXIMO : Math.floor(estoque);
}

/** Nível que o catálogo publicado informa para o item. */
export function nivelPublicado(item: { esgotado?: boolean; restam?: number }): number {
  if (item.esgotado) return 0;
  return typeof item.restam === "number" && item.restam >= 1 && item.restam <= 5 ? item.restam : NIVEL_MAXIMO;
}

/** Só os itens cujo nível de agora difere do publicado (e que existem no catálogo do site). */
export function diferencasDeEstoque(vivo: ReadonlyMap<string, number>, publicado: ReadonlyMap<string, { esgotado?: boolean; restam?: number }>): Mudancas {
  const saida: Mudancas = {};
  for (const [slug, estoque] of vivo) {
    const item = publicado.get(slug);
    if (!item) continue;
    const agora = nivelDeEstoque(estoque);
    if (agora !== nivelPublicado(item)) saida[slug] = agora;
  }
  return saida;
}

export type ItemDaCesta = { id: string; slug?: string; qtd: number; selecionado?: boolean };
export type AvisoCesta = { id: string; tipo: "acabou" | "poucas"; restam: number };

/** Itens da cesta que já acabaram na loja ou têm menos do que o pedido. Item sem `slug` (ou sem mudança) não gera aviso. */
export function avisosDaCesta(itens: readonly ItemDaCesta[], mudou: Mudancas | null): AvisoCesta[] {
  if (!mudou) return [];
  const avisos: AvisoCesta[] = [];
  for (const item of itens) {
    if (!item.slug || item.selecionado === false) continue;
    const nivel = mudou[item.slug];
    if (nivel === undefined) continue;
    if (nivel === 0) avisos.push({ id: item.id, tipo: "acabou", restam: 0 });
    else if (nivel < NIVEL_MAXIMO && item.qtd > nivel) avisos.push({ id: item.id, tipo: "poucas", restam: nivel });
  }
  return avisos;
}

/** Idade, em minutos, do último estoque que o PC da loja enviou. `geradoEm` do DMaster vem sem fuso: vale o horário de Brasília (UTC-3). */
export function idadeEmMinutos(geradoEm: string | null | undefined, agora: number = Date.now()): number | null {
  if (!geradoEm) return null;
  const temFuso = /(Z|[+-]\d{2}:?\d{2})$/.test(geradoEm);
  const t = Date.parse(temFuso ? geradoEm : `${geradoEm}-03:00`);
  return Number.isFinite(t) ? Math.max(0, Math.round((agora - t) / 60_000)) : null;
}

/** A partir de quantos minutos o site avisa que o estoque está desatualizado (plano de finalização, camada 4). */
export const MINUTOS_PARA_AVISAR = 180;

export function textoIdade(minutos: number): string {
  if (minutos < 120) return `${minutos} minutos`;
  const h = Math.round(minutos / 60);
  return h >= 48 ? `${Math.round(h / 24)} dias` : `${h} horas`;
}
