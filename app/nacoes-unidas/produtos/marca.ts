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
