import marcasJson from "./dados/marcas-pelo-nome.json" with { type: "json" };

const REGRAS = (marcasJson as [string, string][]).map(([padrao, marca]) => ({ rx: new RegExp(padrao), marca }));

function semAcentoMaiusculo(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

/** Marca citada no próprio nome do produto (lista curta em dados/marcas-pelo-nome.json). Vazio quando o nome não diz a marca. */
export function marcaPeloNome(nome: string): string {
  const n = semAcentoMaiusculo(nome);
  return REGRAS.find((r) => r.rx.test(n))?.marca ?? "";
}

/** Laboratório/marca do sistema; quando ele vem vazio, a marca que o nome cita. */
export function marcaDoItem(nome: string, lab: string): string {
  const l = lab.trim();
  return l || marcaPeloNome(nome);
}
