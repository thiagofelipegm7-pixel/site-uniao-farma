/**
 * Caixa de lembrete de recompra no checkout (desmarcada por padrão). Só com ela marcada o nome e o celular vão ao servidor,
 * junto com a cesta, para a equipe lembrar o cliente pelo WhatsApp (ver app/recompra.ts e /interno/recompra).
 */
export const TEXTO_CONSENTIMENTO = "Quero receber lembrete pelo WhatsApp quando estiver na hora de repor meus produtos";

/** Celular brasileiro com DDD → "55DDNNNNNNNNN" (o formato do wa.me). Qualquer outra coisa → null. */
export function normalizarTelefone(bruto: unknown): string | null {
  if (typeof bruto !== "string" || bruto.length > 30) return null;
  let d = bruto.replace(/\D/g, "");
  if (d.startsWith("0")) d = d.replace(/^0+/, "");
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99 || d[2] !== "9" || /^(\d)\1+$/.test(d.slice(2))) return null;
  return `55${d}`;
}
