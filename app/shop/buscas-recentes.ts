/**
 * Buscas recentes do cliente, guardadas só neste aparelho (localStorage). Nada disso vai ao analytics: uma busca por remédio pode revelar
 * condição de saúde. O cliente pode remover uma busca ou limpar todas.
 */
export const CHAVE_BUSCAS_RECENTES = "uf_buscas_recentes_v1";
export const MAX_BUSCAS_RECENTES = 5;

const normalizar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Lê o que veio do armazenamento; qualquer coisa fora do formato esperado vira lista vazia. */
export function lerBuscasRecentes(bruto: string | null): string[] {
  if (!bruto) return [];
  try {
    const dado: unknown = JSON.parse(bruto);
    if (!Array.isArray(dado)) return [];
    const vistas = new Set<string>();
    const saida: string[] = [];
    for (const item of dado) {
      if (typeof item !== "string") continue;
      const termo = item.replace(/\s+/g, " ").trim().slice(0, 80);
      const chave = normalizar(termo);
      if (termo.length < 2 || vistas.has(chave)) continue;
      vistas.add(chave);
      saida.push(termo);
      if (saida.length >= MAX_BUSCAS_RECENTES) break;
    }
    return saida;
  } catch {
    return [];
  }
}

/** Põe a busca no topo; se já existia (sem diferenciar acento ou maiúscula), só sobe. Termos de menos de 2 letras são ignorados. */
export function registrarBusca(lista: readonly string[], termo: string): string[] {
  const limpo = termo.replace(/\s+/g, " ").trim().slice(0, 80);
  if (normalizar(limpo).length < 2) return [...lista];
  const chave = normalizar(limpo);
  return [limpo, ...lista.filter((item) => normalizar(item) !== chave)].slice(0, MAX_BUSCAS_RECENTES);
}

export function removerBusca(lista: readonly string[], termo: string): string[] {
  const chave = normalizar(termo);
  return lista.filter((item) => normalizar(item) !== chave);
}

/** Leitura e gravação seguras: o armazenamento pode estar bloqueado (janela privada, site bloqueado). */
export function carregarBuscasRecentes(): string[] {
  try {
    return lerBuscasRecentes(window.localStorage.getItem(CHAVE_BUSCAS_RECENTES));
  } catch {
    return [];
  }
}

export function guardarBuscasRecentes(lista: readonly string[]): void {
  try {
    if (lista.length === 0) window.localStorage.removeItem(CHAVE_BUSCAS_RECENTES);
    else window.localStorage.setItem(CHAVE_BUSCAS_RECENTES, JSON.stringify(lista));
  } catch {
    // sem armazenamento: as buscas recentes só não ficam guardadas
  }
}
