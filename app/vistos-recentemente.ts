/**
 * "Visto recentemente": os últimos produtos que a pessoa abriu, guardados SÓ no navegador dela (localStorage).
 * Nada vai ao servidor nem ao analytics. Remédio nunca entra (o histórico apareceria na tela de quem divide o aparelho).
 */
export const CHAVE_VISTOS = "uf-vistos-v1";
export const MAX_VISTOS = 10;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length <= 120 && SLUG.test(valor);
}

/** Lê o texto guardado; qualquer coisa estranha vira lista vazia. */
export function lerVistos(bruto: string | null): string[] {
  if (!bruto) return [];
  try {
    const dado: unknown = JSON.parse(bruto);
    if (!Array.isArray(dado)) return [];
    const saida: string[] = [];
    for (const s of dado) if (slugValido(s) && !saida.includes(s)) saida.push(s);
    return saida.slice(0, MAX_VISTOS);
  } catch {
    return [];
  }
}

/** O produto aberto agora vai para a frente; os repetidos saem; no máximo 10. */
export function adicionarVisto(lista: readonly string[], slug: string): string[] {
  if (!slugValido(slug)) return [...lista];
  return [slug, ...lista.filter((s) => s !== slug)].slice(0, MAX_VISTOS);
}

export function carregarVistos(): string[] {
  try {
    return lerVistos(window.localStorage.getItem(CHAVE_VISTOS));
  } catch {
    return [];
  }
}

export function guardarVisto(slug: string): void {
  try {
    window.localStorage.setItem(CHAVE_VISTOS, JSON.stringify(adicionarVisto(carregarVistos(), slug)));
  } catch {
    // navegação privada ou sem espaço: só não lembra
  }
}

export function limparVistos(): void {
  try {
    window.localStorage.removeItem(CHAVE_VISTOS);
  } catch {
    // sem armazenamento
  }
}
