/**
 * Fotos extras (coleção) de cada produto, na ordem de exibição, a partir do índice gerado pela sincronização:
 * chave = EAN, valor = caminhos a partir de /public (ex.: /produtos-extras/7500435239417/01.webp).
 * Sem entrada, a ficha mostra só a foto principal.
 */
import fotosExtrasJson from "./dados/fotos-extras.json" with { type: "json" };

const INDICE = fotosExtrasJson as Readonly<Record<string, readonly string[]>>;

export function fotosExtrasDoProduto(ean: string | null | undefined): readonly string[] {
  if (!ean) return [];
  return INDICE[ean] ?? [];
}
