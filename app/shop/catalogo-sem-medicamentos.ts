/**
 * Links do catálogo que nunca incluem o departamento Medicamentos (Anvisa:
 * estes atalhos da home não podem destacar remédio, inclusive MIP).
 * Os nomes batem com as facetas reais (`catalogo-index.json`).
 */
export const DEPARTAMENTOS_SEM_MEDICAMENTOS = [
  "Dermocosméticos",
  "Perfumes",
  "Infantil e Gestante",
  "Beleza",
  "Cuidado Diário",
  "Bem Estar",
] as const;

/** Só o caminho, para usar em <a href>. precoMax está em reais, como ?preco_max= do catálogo. */
export function urlCatalogoSemMedicamentos(opts?: { precoMaxReais?: number; ordem?: "menor_preco" | "maior_preco" }): string {
  const u = new URL("/nacoes-unidas/produtos", "https://xn--uniofarmasabar-8gbu.com.br");
  for (const nome of DEPARTAMENTOS_SEM_MEDICAMENTOS) u.searchParams.append("departamento", nome);
  if (opts?.precoMaxReais != null) u.searchParams.set("preco_max", String(opts.precoMaxReais));
  if (opts?.ordem) u.searchParams.set("ordem", opts.ordem);
  return `${u.pathname}${u.search}`;
}
