/**
 * O que não tem preço, cesta nem pedido no site: medicamentos de controle especial (Portaria SVS/MS 344/98: listas A1 a A3, B1, B2 e C1 a C5),
 * que não podem ser vendidos pela internet (RDC 812/2023, art. 34-B da Portaria 344), e antimicrobianos (receita retida, RDC 20/2011), tratados
 * do mesmo jeito por cautela. A venda é só na loja, com a receita. Módulo pequeno e sem dados: a cesta e o gerador de arquivos usam a mesma regra.
 * O gerador (scripts/gerar-assets-catalogo.mjs) tem uma réplica; um teste confere que as duas dizem o mesmo.
 */

// Lista de antimicrobianos de ops/catalogo-nacoes/gerar.py (ANTIMICROB e TOPICO), a mesma que classifica a "receita com retenção".
export const ANTIMICROB = /(?<![A-Z])(AMOXICILINA|AMOX|CLAVULAN|NOVAMOX|CLAVULIN|AZITROMICINA|CLARITROMICINA|ERITROMICINA|CEFALEXINA|CEFADROXILA|CEFUROXIMA|AXETILCEFUROXIMA|CEFTRIAXONA|CIPROFLOXACINO|LEVOFLOXACINO|MOXIFLOXACINO|NORFLOXACINO|OFLOXACINO|DOXICICLINA|TETRACICLINA|MINOCICLINA|SULFAMETOXAZOL|BACTRIM|BELFACTRIM|METRONIDAZOL|TINIDAZOL|SECNIDAZOL|NITROFURANTOINA|MACRODANTINA|FOSFOMICINA|CLINDAMICINA|PENICILINA|NOVOCILIN|AMPICILINA|FLUCONAZOL|ITRACONAZOL|NITAZOXANIDA)/;
export const TOPICO = /(?<![A-Z])(CREME|CR|POM|POMADA|GEL|SPRAY|COLIRIO|OFT|OFTALM\w*|VAG|VAGINAL|OVULO|OVL|SOL TOP|LOCAO)(?![A-Z])/;

function maiusculoSemAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

/** Antimicrobiano de uso sistêmico pelo nome (os de uso tópico, como cremes e colírios, ficam de fora). */
export function ehAntimicrobiano(nome: string): boolean {
  const n = maiusculoSemAcento(nome);
  return ANTIMICROB.test(n) && !TOPICO.test(n);
}

/** Controle especial da Portaria 344/98: listas A1 a A3, B1, B2 e C1 a C5. "A/B" (antimicrobiano que o catálogo agrupa com os controlados) não é. */
export function ehPortaria344(controlado: boolean, lista: string | undefined | null): boolean {
  return controlado && /^(A[1-3]|B[12]|C[1-5])$/i.test((lista ?? "").trim());
}

export type SemVenda = { portaria344: boolean; antimicrobiano: boolean; semVenda: boolean };

/**
 * `controlado`: o item está na lista de controlados do catálogo. `retencao`: a receita fica retida na loja.
 * Antimicrobiano = na lista de controlados sem ser da Portaria 344, ou receita retida com nome de antimicrobiano.
 */
export function classificarSemVenda(a: { controlado: boolean; lista?: string | null; nome: string; retencao: boolean | null }): SemVenda {
  const portaria344 = ehPortaria344(a.controlado, a.lista);
  const antimicrobiano = !portaria344 && (a.controlado || (a.retencao === true && ehAntimicrobiano(a.nome)));
  return { portaria344, antimicrobiano, semVenda: portaria344 || antimicrobiano };
}
