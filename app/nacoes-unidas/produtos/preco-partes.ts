/** "R$ 1.234,50" → { reais: "1.234", centavos: "50" }. Devolve null se não for um preço. */
export function partesPreco(precoFmt: string): { reais: string; centavos: string } | null {
  const m = /(\d[\d.]*),(\d{2})/.exec(precoFmt);
  return m ? { reais: m[1], centavos: m[2] } : null;
}


