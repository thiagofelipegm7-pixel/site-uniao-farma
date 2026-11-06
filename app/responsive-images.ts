/** Fotos que existem em um só tamanho (sem variantes -360/-480/-768): o navegador usa só o `src`. */
const SEM_VARIANTES = new Set(["/promotions/cerave-creme-hidratante-85g.webp", "/promotions/sunless-kit-fps50.webp"]);

export function responsiveSrcSet(src: string, widths: number[]): string | undefined {
  const [path, query] = src.split("?");
  if (SEM_VARIANTES.has(path)) return undefined;
  if (!path.toLowerCase().endsWith(".webp") || widths.length === 0) return undefined;

  const extensionIndex = path.lastIndexOf(".webp");
  if (extensionIndex < 0) return undefined;

  const stem = path.slice(0, extensionIndex);
  const suffix = query ? `?${query}` : "";
  return widths.map((width) => `${stem}-${width}.webp${suffix} ${width}w`).join(", ");
}
