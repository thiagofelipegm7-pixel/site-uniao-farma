import { ehNbcal } from "./produto";

/**
 * "Combina com": sugestões de itens do catálogo público. Não existe histórico real de compra, então o texto nunca diz "quem comprou".
 * Os pares vêm de um arquivo estático (dados/relacionados-ia.json), gerado fora do site e filtrado por regra: nada de IA por visita.
 * Regras de segurança (valem para quem gera e para quem exibe):
 *  - nunca medicamento (com receita, controlado ou isento): nem como item de origem, nem como sugestão;
 *  - nunca fórmula infantil, chupeta, bico ou mamadeira (NBCAL), suplemento, chá, alimento ou item de ingerir;
 *  - só itens do catálogo público (sem receita), com preço.
 */

export type ItemElegivel = { nome: string; categoria: string; isMIP?: boolean };

/** Categorias de onde saem pares. "Bem Estar" (suplementos, chás, alimentos) e "Medicamentos" ficam de fora. */
export const CATEGORIAS_COM_PARES = ["Cuidado Diário", "Beleza", "Dermocosméticos", "Infantil e Gestante", "Perfumes"] as const;

const FORMULA_INFANTIL = /\b(APTAMIL|NAN|NESTOGENO|ENFAMIL|NUTRILON|MILNUTRI|PREGOMIN|ALFARE|NINHO|SUPRINUTRI|FORMULA|COMPOSTO LACTEO|LEITE EM PO)\b/;
const DE_INGERIR = /\b(GOMAS?|VIT|VITAMINAS?|BIOTINA|OMEGA|COLAGENO|MAGNESIO|ZINCO|LICOPENO|SUPLEMENTO|CAPS?|CPS|CPR|COMP|SACHES?|XPE|XAROPE|CHA|BEB|LACTEA|ADOCANTE|ENERGETICO|BALA|CHICLE|PASTILHAS?)\b|\b\d+(?:[.,]\d+)?\s?(?:MCG|UI)\b/;

/** Material de saúde, curativo, químico e produto que sugere condição (acne, assadura...): nunca entram em "Combina com". */
const SAUDE_OU_QUIMICO = /\b(AGULHAS?|SERINGAS?|LANCETAS?|TIRAS?|GLICO\w*|TERMOMETROS?|CURATIVOS?|ATADURAS?|GAZES?|ESPARADRAPOS?|MICROPORE|AGUA OXIGENADA|ALCOOL|IODO|AMONIA|MERTHIOLATE|MERCUROCROMO|SORO|TESTES?|PRESERVATIVOS?|CAMISINHAS?|LUBRIFICANTES?|OXIMETROS?|MEDIDOR|INALADOR|NEBULIZADOR|ACNE|ANTIACNE|ASSADURAS?|CICATRIZ\w*|PSORIASE|MICOSES?|HEMORROIDAS?|PIOLHOS?|PEDICUL\w*|VERRUGAS?|CALICIDA|JOANETES?|HERPES|GERIATRIC\w*|URINARIA|COLETOR|SONDA|BOMBA|ENEMA|SUPOSITORIO|OVULO|PEDRA HUME|BORICADA|ANTISSEPTIC[OA]|PERMANGANATO|SOLUCAO|DESCONGESTIONANTE)\b/;

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function ehFormulaInfantil(nome: string): boolean {
  return FORMULA_INFANTIL.test(semAcento(nome));
}

export function ehDeIngerir(nome: string): boolean {
  return DE_INGERIR.test(semAcento(nome));
}

export function ehSaudeOuQuimico(nome: string): boolean {
  return SAUDE_OU_QUIMICO.test(semAcento(nome));
}

/** Pode aparecer como sugestão ou ter sugestões? Só higiene, beleza, pele, bebê (sem NBCAL) e perfumaria. */
export function elegivelParaPares(item: ItemElegivel): boolean {
  if (item.isMIP) return false;
  if (!(CATEGORIAS_COM_PARES as readonly string[]).includes(item.categoria)) return false;
  if (ehNbcal(item.nome) || ehFormulaInfantil(item.nome) || ehDeIngerir(item.nome) || ehSaudeOuQuimico(item.nome)) return false;
  return true;
}

export type Pares = Record<string, readonly string[]>;
export const MIN_SUGESTOES = 3;
export const MAX_SUGESTOES = 6;

/** Devolve de 3 a 6 slugs sem repetir os já escolhidos; menos de 3 vira lista vazia (a seção some). */
export function sugestoesDoProduto(pares: Pares, slug: string, excluir: ReadonlySet<string> = new Set()): string[] {
  const lista = (pares[slug] ?? []).filter((s) => s !== slug && !excluir.has(s));
  const unicos = [...new Set(lista)].slice(0, MAX_SUGESTOES);
  return unicos.length >= MIN_SUGESTOES ? unicos : [];
}

/** Cesta: junta os pares de cada item elegível (um de cada vez, em rodízio), sem repetir nem sugerir o que já está na cesta. */
export function sugestoesDaCesta(pares: Pares, slugsDaCesta: readonly string[], max = 4): string[] {
  const naCesta = new Set(slugsDaCesta);
  const listas = slugsDaCesta.map((s) => (pares[s] ?? []).filter((x) => !naCesta.has(x)));
  const saida: string[] = [];
  for (let i = 0; saida.length < max && listas.some((l) => i < l.length); i += 1) {
    for (const lista of listas) {
      const slug = lista[i];
      if (slug && !saida.includes(slug)) saida.push(slug);
      if (saida.length >= max) break;
    }
  }
  return saida.length >= MIN_SUGESTOES ? saida : [];
}
