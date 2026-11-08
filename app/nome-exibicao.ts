/**
 * Nome de exibição do produto. O sistema da loja manda o nome em caixa alta e abreviado
 * ("DES ROLL ON NIVEA PROTECT 50ML"); no site aparece como o cliente fala ("Desodorante roll-on Nivea Protect 50ml").
 * Só expande abreviações conhecidas e ajusta caixa e unidades. Não inventa informação.
 */
import PALAVRAS_JSON from "./nome-exibicao-palavras.json" with { type: "json" };
import CORRIGIDOS_JSON from "./nacoes-unidas/produtos/dados/nomes-corrigidos.json" with { type: "json" };

const PALAVRAS = PALAVRAS_JSON as Record<string, string>;
/** Nomes corrigidos à mão no painel interno (chave = nome do sistema da loja, sem acento e em maiúsculas). Têm prioridade sobre a regra automática. */
const CORRIGIDOS = CORRIGIDOS_JSON as Record<string, string>;

export function chaveDoNome(nome: string): string {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}
const MINUSCULAS = new Set(["de", "da", "do", "e", "com", "sem", "para", "em", "na", "no", "a", "o"]);
function formatarPalavra(bruta: string, anterior = ""): string {
  const p = bruta.toLowerCase();
  // "G" sozinho depois de número é grama ("100 g"); fora disso é tamanho ("Fralda ... G").
  if ((p === "g" || p === "gr") && !/^\d/.test(anterior)) return "G";
  const colada = /^(\d+)(cpr|comp|caps|cap|cps|drg|env)$/.exec(p);
  if (colada) return `${colada[1]} ${PALAVRAS[colada[2]] ?? colada[2]}`;
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
  const corrigido = CORRIGIDOS[chaveDoNome(nomeBruto)];
  if (corrigido) return corrigido;
  const limpo = nomeBruto.replace(/[*]+$/g, "").replace(/\s+/g, " ").trim();
  if (!limpo) return nomeBruto;
  // "ROLL ON" vira "roll-on" (como o rótulo escreve).
  const juntado = limpo.replace(/\broll on\b/gi, "roll-on");
  const brutas = juntado.split(" ");
  const partes = brutas.map((b, i) => formatarPalavra(b, brutas[i - 1] ?? ""));
  // Junta número e unidade que a regra de medida separou ("200 ml"): já vêm em um token só.
  const texto = partes.join(" ").replace(/\s+/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
