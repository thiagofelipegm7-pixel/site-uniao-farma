import marcasJson from "./dados/marcas-pelo-nome.json" with { type: "json" };
import corrigidasJson from "./dados/marcas-corrigidas.json" with { type: "json" };

const REGRAS = (marcasJson as [string, string][]).map(([padrao, marca]) => ({ rx: new RegExp(padrao), marca }));
/** Marcas que a equipe preencheu no painel (chave = nome do sistema sem acento, em maiúsculas). Escrito pela sincronização. */
const CORRIGIDAS = corrigidasJson as Record<string, string>;

function semAcentoMaiusculo(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

function chaveDoNome(nome: string): string {
  return semAcentoMaiusculo(nome).replace(/\s+/g, " ").trim();
}

/** Marca citada no próprio nome do produto (lista curta em dados/marcas-pelo-nome.json). Vazio quando o nome não diz a marca. */
export function marcaPeloNome(nome: string): string {
  const n = semAcentoMaiusculo(nome);
  return REGRAS.find((r) => r.rx.test(n))?.marca ?? "";
}

/** Marca que vale: a preenchida no painel; senão o laboratório do sistema; senão a que o nome cita. */
export function marcaDoItem(nome: string, lab: string): string {
  const preenchida = CORRIGIDAS[chaveDoNome(nome)];
  if (preenchida) return preenchida;
  const l = lab.trim();
  return l || marcaPeloNome(nome);
}

/** Marcas que o cliente reconhece e como escrevê-las; a palavra-chave é procurada no nome do produto (sem acento, minúsculas). */
const MARCAS_DE_PRODUTO: ReadonlyArray<readonly [string, string]> = [
  ["dove", "Dove"], ["nivea", "Nivea"], ["rexona", "Rexona"], ["seda", "Seda"], ["pantene", "Pantene"], ["colgate", "Colgate"], ["neutrogena", "Neutrogena"],
  ["cerave", "CeraVe"], ["cetaphil", "Cetaphil"], ["granado", "Granado"], ["johnsons", "Johnson's"], ["johnson", "Johnson's"], ["j j", "Johnson's"], ["sundown", "Sundown"], ["always", "Always"], ["pampers", "Pampers"],
  ["oral b", "Oral-B"], ["sensodyne", "Sensodyne"], ["listerine", "Listerine"], ["tresemme", "TRESemmé"], ["garnier", "Garnier"], ["loreal", "L'Oréal"],
  ["monange", "Monange"], ["intimus", "Intimus"], ["gillette", "Gillette"], ["prestobarba", "Gillette"], ["axe", "Axe"], ["lux", "Lux"], ["vasenol", "Vasenol"], ["cicatricure", "Cicatricure"],
  ["wella", "Wella"], ["embelleze", "Embelleze"], ["salon line", "Salon Line"], ["skala", "Skala"], ["bio extratus", "Bio Extratus"], ["bioextratus", "Bio Extratus"], ["farmax", "Farmax"],
  ["babysec", "Babysec"], ["isababy", "Isababy"], ["personal", "Personal"], ["kuka", "Kuka"], ["buba", "Buba"], ["cremer", "Cremer"], ["missner", "Missner"], ["impala", "Impala"],
  ["risque", "Risqué"], ["niely", "Niely"], ["alta moda", "Alta Moda"], ["dentil", "Dentil"], ["bozzano", "Bozzano"], ["condor", "Condor"], ["hillo", "Hillo"], ["colorama", "Colorama"],
  ["palmolive", "Palmolive"], ["close up", "Close Up"], ["reach", "Reach"], ["protex", "Protex"], ["fixodent", "Fixodent"], ["paixao", "Paixão"], ["novex", "Novex"], ["darling", "Darling"],
];

/** Marca do produto comum quando o nome a cita ("Absorvente Always..." -> "Always"); vazio quando não dá para saber (nesse caso o cartão mostra o fabricante). */
export function marcaDeProduto(nome: string): string {
  // Palavras inteiras: "lux" não vale para "luxo" nem "seda" para "sedativo".
  const n = ` ${semAcentoMaiusculo(nome).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
  return MARCAS_DE_PRODUTO.find(([chave]) => n.includes(` ${chave} `))?.[1] ?? "";
}

/** Siglas que ficam em maiúsculas; qualquer outra palavra vira "Capitalizada" ("NEO" -> "Neo"). */
const SIGLAS = new Set(["EMS", "DKT", "3M", "J&J", "P&G", "HC"]);
const LIGACAO = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);

/** "CIMED" -> "Cimed", "NEO QUIMICA" -> "Neo Quimica", "COSMED DE COSMETICOS" -> "Cosmed de Cosmeticos", "EMS" e "J&J" ficam como estão. */
export function marcaLegivel(marca: string): string {
  return marca
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((p, i) => {
      const maiusculo = p.toUpperCase();
      if (SIGLAS.has(maiusculo)) return maiusculo;
      if (i > 0 && LIGACAO.has(maiusculo)) return p.toLowerCase();
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(" ");
}
