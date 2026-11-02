/**
 * Nome de exibição do produto. O sistema da loja manda o nome em caixa alta e abreviado
 * ("DES ROLL ON NIVEA PROTECT 50ML"); no site aparece como o cliente fala ("Desodorante roll-on Nivea Protect 50ml").
 * Só expande abreviações conhecidas e ajusta caixa e unidades. Não inventa informação.
 */
const PALAVRAS: Record<string, string> = {
  "roll-on": "roll-on", gr: "g", g: "g", ml: "ml", des: "Desodorante", desod: "Desodorante", cr: "Creme", sab: "Sabonete", prot: "Protetor", hidrat: "Hidratante",
  locao: "Loção", shamp: "Shampoo", cond: "Condicionador", enx: "Enxaguante", esc: "Escova", cap: "cápsulas", caps: "cápsulas",
  comp: "comprimidos", cpr: "comprimidos", mastigavel: "mastigável", glic: "Glicerinado", trad: "Tradicional", bebe: "bebê",
  "s/frag": "sem fragrância", "c/": "com", "s/": "sem", maca: "Maçã", peruana: "Peruana", po: "pó", omega: "Ômega",
  vitamina: "Vitamina", dental: "dental", aero: "Aerosol", hidratante: "Hidratante", corporal: "corporal", facial: "facial",
  oleosidade: "oleosidade", controle: "controle", refil: "refil", granado: "Granado", rosa: "rosa", radiant: "Radiant", glow: "Glow",
};
const MINUSCULAS = new Set(["de", "da", "do", "e", "com", "sem", "para", "em", "na", "no", "a", "o"]);
function formatarPalavra(bruta: string): string {
  const p = bruta.toLowerCase();
  const med = /^(\d+(?:[.,]\d+)?)(ml|mg|g|gr|kg|l|mcg|mts|mt)$/.exec(p);
  if (med) return `${med[1]}${med[2] === "gr" ? "g" : med[2] === "mts" || med[2] === "mt" ? "m" : med[2]}`;
  const comPre = /^c\/(\d+)$/.exec(p);
  if (comPre) return `com ${comPre[1]}`;
  if (PALAVRAS[p]) return PALAVRAS[p];
  if (MINUSCULAS.has(p)) return p;
  if (/^\d/.test(p) || /^fps\d*$/.test(p)) return p.toUpperCase().replace(/^FPS/, "FPS");
  return p.charAt(0).toUpperCase() + p.slice(1);
}

export function nomeDeExibicao(nomeBruto: string): string {
  const limpo = nomeBruto.replace(/[*]+$/g, "").replace(/\s+/g, " ").trim();
  if (!limpo) return nomeBruto;
  // "ROLL ON" vira "roll-on" (como o rótulo escreve).
  const juntado = limpo.replace(/\broll on\b/gi, "roll-on");
  const partes = juntado.split(" ").map(formatarPalavra);
  // Junta número e unidade que a regra de medida separou ("200 ml"): já vêm em um token só.
  const texto = partes.join(" ").replace(/\s+/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
