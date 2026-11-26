/**
 * Sincronização de cesta entre dispositivos.
 * Usa um código curto que o cliente pode digitar em outro aparelho.
 */
export const CHAVE_SYNC = "uf-sync-codigo";

export function gerarCodigo(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function codigoAtual(): string | null {
  try {
    return localStorage.getItem(CHAVE_SYNC);
  } catch {
    return null;
  }
}

export function salvarCodigo(codigo: string) {
  try {
    localStorage.setItem(CHAVE_SYNC, codigo);
  } catch {}
}
