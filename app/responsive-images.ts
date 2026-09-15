export function responsiveSrcSet(src: string, widths: number[]): string | undefined {
  const [path, query] = src.split("?");
  if (!path.toLowerCase().endsWith(".webp") || widths.length === 0) return undefined;

  const extensionIndex = path.lastIndexOf(".webp");
  if (extensionIndex < 0) return undefined;

  const stem = path.slice(0, extensionIndex);
  const suffix = query ? `?${query}` : "";
  return widths.map((width) => `${stem}-${width}.webp${suffix} ${width}w`).join(", ");
}
