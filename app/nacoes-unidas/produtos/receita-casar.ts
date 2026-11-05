/**
 * Leitura de receita: junta o que a IA transcreveu com o catálogo REAL da loja (100% local, sem rede).
 * A IA só entrega nomes e concentrações; aqui nada é inventado: só aparece produto que existe no catálogo.
 * Medicamento com receita e controlado continuam nas mesmas regras da loja (retirada com a receita), pois vêm da lista restrita.
 */
import { analisarConsulta, criarVocabulario, type Vocabulario } from "./busca-tolerante";
import { normalizarBusca, termosDeBusca } from "./busca";

export type MedicamentoLido = { nome: string; dosagem: string | null };

export type ProdutoNormal = { nome: string; slug: string; precoCentavos: number; foto: string | null; busca: string };
export type ProdutoRestrito = {
  nome: string;
  nomeOriginal?: string;
  tipo: "receita" | "controlados";
  precoCentavos: number | null;
  busca: string;
  q: string;
  apresentacao: string | null;
  tarja: "vermelha" | "vermelha-retencao" | "preta" | null;
  retencao: boolean | null;
  controlado: boolean;
  generico?: boolean;
  ativo?: string | null;
};

export type ItemCasado =
  | { tipo: "normal"; chave: string; nome: string; precoCentavos: number; foto: string | null; slug: string; doseConfere: boolean | null }
  | { tipo: "receita" | "controlados"; chave: string; nome: string; precoCentavos: number; produto: ProdutoRestrito; doseConfere: boolean | null };

export type ResultadoMedicamento = {
  lido: MedicamentoLido;
  /** achado: tem produto para pôr na cesta. dose: o nome existe, mas não na dosagem da receita. nao: não está no catálogo. */
  status: "achado" | "dose" | "nao";
  /** Como a loja entendeu o nome quando foi preciso corrigir a escrita (para a pessoa conferir). */
  entendidoComo: string | null;
  itens: ItemCasado[];
  /** Nomes que existem na loja mas em outra dosagem (só informativo, sem botão de cesta). */
  outrasDoses: string[];
};

export const MAX_ITENS_POR_MEDICAMENTO = 6;

export type CatalogoReceita = {
  normais: readonly ProdutoNormal[];
  restritos: readonly ProdutoRestrito[];
  vocabulario: Vocabulario;
};

export function prepararCatalogo(normais: readonly ProdutoNormal[], restritos: readonly ProdutoRestrito[]): CatalogoReceita {
  return { normais, restritos, vocabulario: criarVocabulario([...normais.map((p) => p.busca), ...restritos.map((p) => p.busca)]) };
}

// ---- dosagem -------------------------------------------------------------------------------------------------------

type Dose = { valor: number; unidade: "mg" | "ml" | "ui" | "%" };

/** "0,5 mg", "1 g", "500mcg", "250 mg/5 ml" → lista de doses comparáveis (massa sempre em mg). */
export function lerDoses(texto: string | null | undefined): Dose[] {
  if (!texto) return [];
  const limpo = texto.toLowerCase().replace(/,/g, ".").replace(/(\d)\s+(?=(mg|mcg|µg|μg|g|ml|ui|%))/g, "$1");
  const doses: Dose[] = [];
  for (const m of limpo.matchAll(/(\d+(?:\.\d+)?)(mcg|µg|μg|mg|g|ml|ui|%)(?![a-z])/g)) {
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= 0) continue;
    const u = m[2];
    if (u === "g") doses.push({ valor: n * 1000, unidade: "mg" });
    else if (u === "mg") doses.push({ valor: n, unidade: "mg" });
    else if (u === "mcg" || u === "µg" || u === "μg") doses.push({ valor: n / 1000, unidade: "mg" });
    else doses.push({ valor: n, unidade: u as "ml" | "ui" | "%" });
  }
  return doses;
}

const mesma = (a: Dose, b: Dose) => a.unidade === b.unidade && Math.abs(a.valor - b.valor) < 1e-6;

/** null = o produto não diz a dosagem no nome (não dá para afirmar); true/false = confere ou não com a receita. */
export function doseConfere(dosesReceita: readonly Dose[], nomeProduto: string): boolean | null {
  if (dosesReceita.length === 0) return null;
  const doProduto = lerDoses(nomeProduto);
  if (doProduto.length === 0) return null;
  return dosesReceita.every((d) => doProduto.some((p) => mesma(d, p)));
}

// ---- nome ----------------------------------------------------------------------------------------------------------

const SEM_VALOR = new Set([
  "comprimido", "comprimidos", "comp", "cp", "cpr", "cps", "capsula", "capsulas", "caps", "cap", "gotas", "gota", "xarope", "solucao", "sol", "oral",
  "generico", "mg", "ml", "mcg", "ui", "uso", "revestido", "revestidos", "injetavel", "pomada", "creme", "gel", "tablete", "dose", "de", "do", "da", "com", "e",
  "sodica", "sodico", "potassica", "potassico", "cloridrato", "bromidrato", "sulfato", "maleato", "succinato", "tartarato",
]);

/** Palavras do nome que identificam o remédio (sem número, unidade nem forma). */
export function palavrasDoNome(nome: string): string[] {
  return termosDeBusca(nome.replace(/\d+(?:[.,]\d+)?\s*(mg|mcg|g|ml|ui|%)?/gi, " ").replace(/[^\p{L}\s]/gu, " "))
    .filter((t) => t.length >= 3 && !SEM_VALOR.has(t));
}

function casaTodas(busca: string, palavras: readonly string[]): boolean {
  return palavras.length > 0 && palavras.every((p) => busca.includes(p));
}

function ordenar<T extends ItemCasado>(itens: T[], primeira: string): T[] {
  const inicio = (i: ItemCasado) => (normalizarBusca(i.nome).startsWith(primeira) ? 0 : 1);
  const dose = (i: ItemCasado) => (i.doseConfere === true ? 0 : 1);
  return itens.sort((a, b) => inicio(a) - inicio(b) || dose(a) - dose(b) || a.precoCentavos - b.precoCentavos || a.nome.localeCompare(b.nome, "pt-BR"));
}

type Candidato = ItemCasado;

function candidatos(catalogo: CatalogoReceita, palavras: readonly string[], dosesReceita: readonly Dose[]): Candidato[] {
  const saida: Candidato[] = [];
  for (const p of catalogo.normais) {
    if (p.precoCentavos > 0 && casaTodas(p.busca, palavras)) {
      saida.push({ tipo: "normal", chave: `n:${p.slug}`, nome: p.nome, precoCentavos: p.precoCentavos, foto: p.foto, slug: p.slug, doseConfere: doseConfere(dosesReceita, p.nome) });
    }
  }
  for (const p of catalogo.restritos) {
    // Sem preço fica fora da cesta (regra da lista de preços da loja).
    if (p.precoCentavos !== null && p.precoCentavos > 0 && casaTodas(p.busca, palavras)) {
      saida.push({ tipo: p.tipo, chave: `r:${p.tipo}:${p.nome}`, nome: p.nome, precoCentavos: p.precoCentavos, produto: p, doseConfere: doseConfere(dosesReceita, p.nomeOriginal ?? p.nome) });
    }
  }
  return saida;
}

/** Casa UM medicamento lido da receita com o catálogo. */
export function casarMedicamento(catalogo: CatalogoReceita, lido: MedicamentoLido): ResultadoMedicamento {
  const dosesReceita = lerDoses(lido.dosagem).length > 0 ? lerDoses(lido.dosagem) : lerDoses(lido.nome);
  const base: ResultadoMedicamento = { lido, status: "nao", entendidoComo: null, itens: [], outrasDoses: [] };
  const original = palavrasDoNome(lido.nome);
  if (original.length === 0) return base;

  // 1) como está escrito; 2) só se nada casar, com erro de escrita corrigido por palavra bem parecida do catálogo.
  let palavras = original;
  let lista = candidatos(catalogo, palavras, dosesReceita);
  if (lista.length === 0 && original.length > 1) {
    // "Losartana potássica": o nome principal sozinho.
    palavras = [original[0]];
    lista = candidatos(catalogo, palavras, dosesReceita);
  }
  let entendidoComo: string | null = null;
  if (lista.length === 0) {
    const analise = analisarConsulta(catalogo.vocabulario, original.join(" "));
    if (analise.corrigida) {
      const corrigidas = palavrasDoNome(analise.corrigida);
      const tentativa = candidatos(catalogo, corrigidas, dosesReceita);
      const principal = tentativa.length === 0 && corrigidas.length > 1 ? candidatos(catalogo, [corrigidas[0]], dosesReceita) : tentativa;
      if (principal.length > 0) {
        lista = principal;
        palavras = corrigidas;
        entendidoComo = corrigidas.join(" ");
      }
    }
  }
  if (lista.length === 0) return base;

  // Com dosagem na receita: quem confirma a dose vem primeiro; produto sem dose no nome só entra se nenhum confirmar.
  let sim = lista.filter((i) => i.doseConfere !== false);
  if (sim.some((i) => i.doseConfere === true)) sim = sim.filter((i) => i.doseConfere === true);
  if (sim.length === 0) {
    return { ...base, status: "dose", entendidoComo, outrasDoses: ordenar(lista, palavras[0]).slice(0, 3).map((i) => i.nome) };
  }
  return { ...base, status: "achado", entendidoComo, itens: ordenar(sim, palavras[0]).slice(0, MAX_ITENS_POR_MEDICAMENTO) };
}

export function casarReceita(catalogo: CatalogoReceita, lidos: readonly MedicamentoLido[]): ResultadoMedicamento[] {
  return lidos.map((m) => casarMedicamento(catalogo, m));
}

/** Mensagem para o farmacêutico no WhatsApp com os itens que a loja não achou. Só nome e dosagem; sem dado pessoal. */
export function mensagemNaoEncontrados(resultados: readonly ResultadoMedicamento[]): string {
  const faltam = resultados.filter((r) => r.status !== "achado");
  const linhas = faltam.map((r) => `- ${r.lido.nome}${r.lido.dosagem ? ` ${r.lido.dosagem}` : ""}`);
  return `Olá! Li minha receita no site e estes itens não apareceram no catálogo:\n${linhas.join("\n")}\nVocês têm? Posso enviar a foto da receita por aqui.`;
}
