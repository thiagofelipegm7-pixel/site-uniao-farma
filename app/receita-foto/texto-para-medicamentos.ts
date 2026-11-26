/**
 * Acha medicamentos num texto de receita (lido do PDF ou por OCR no aparelho), sem IA.
 * Só entra nome que existe no catálogo da loja: primeiro nome de cada produto e princípio ativo.
 * Quem decide o produto e a dose depois é o casamento de receita (receita-casar.ts), igual ao caminho com IA.
 */
import { normalizarBusca } from "../nacoes-unidas/produtos/busca";
import type { CatalogoReceita, MedicamentoLido } from "../nacoes-unidas/produtos/receita-casar";

/** Palavras que abrem nomes de produto mas também aparecem em qualquer receita: nunca viram medicamento. */
const IGNORAR = new Set([
  "comprimido", "comprimidos", "capsula", "capsulas", "solucao", "suspensao", "xarope", "gotas", "pomada", "creme", "gel", "injetavel",
  "tomar", "tomo", "uso", "oral", "via", "caixa", "frasco", "cartela", "dias", "horas", "manha", "noite", "cada", "antes", "apos",
  "paciente", "receituario", "receita", "medico", "clinica", "assinatura", "validade", "adulto", "infantil", "pediatrico", "generico",
  "similar", "dose", "unidade", "unidades", "agua", "sabonete", "shampoo", "protetor", "solar", "tratamento", "continuo", "mensal",
  "diario", "diaria", "refeicao", "refeicoes", "jejum", "dormir", "tomar", "aplicar", "usar", "tablete", "comp", "cps",
  // sais e formas que vêm depois do nome ("Losartana potássica", "Cloridrato de ..."): fazem parte do nome, não são outro remédio
  "potassica", "sodica", "calcica", "magnesica", "cloridrato", "sulfato", "besilato", "maleato", "succinato", "tartarato", "fumarato",
  "acetato", "bromidrato", "hemifumarato", "dihidratado", "monoidratado", "valerato", "propionato", "dipropionato", "nitrato", "fosfato",
]);

type Indice = { palavras: Map<string, string> };
const cache = new WeakMap<object, Indice>();

function palavrasDe(texto: string): string[] {
  return normalizarBusca(texto)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function indiceDoCatalogo(catalogo: CatalogoReceita): Indice {
  const guardado = cache.get(catalogo);
  if (guardado) return guardado;
  const palavras = new Map<string, string>();
  const guardar = (palavra: string, original: string) => {
    if (palavra.length < 5 || /\d/.test(palavra) || IGNORAR.has(palavra) || palavras.has(palavra)) return;
    palavras.set(palavra, original);
  };
  for (const p of catalogo.restritos) {
    const primeira = palavrasDe(p.nome)[0];
    if (primeira) guardar(primeira, primeira);
    if (p.ativo) for (const a of palavrasDe(p.ativo)) guardar(a, a);
  }
  for (const p of catalogo.normais) {
    // Produto comum só conta se o nome tem dose (é remédio): evita casar cosmético com palavra solta da receita.
    // Só dose em mg, mcg ou UI: "Leite de Colônia 200ml" não é remédio e casaria com a palavra "leite" de qualquer papel.
    if (!/\d\s*(mg|mcg|ui)\b/i.test(p.nome)) continue;
    const primeira = palavrasDe(p.nome)[0];
    if (primeira) guardar(primeira, primeira);
  }
  const indice = { palavras };
  cache.set(catalogo, indice);
  return indice;
}

/** 1 troca, falta ou sobra de letra (erro comum de OCR). Só para palavras longas, para não confundir remédios parecidos. */
function distanciaAte1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  return b.slice(i + 1) === a.slice(i);
}

const DOSE = /(\d+(?:[.,]\d+)?)\s*(mcg|mg|g|ml|ui)(?![a-z])/;

/** Primeira dose logo depois do nome (até 6 palavras adiante), como "500 mg". */
function doseApos(palavras: string[], desde: number): string | null {
  const janela = palavras.slice(desde + 1, desde + 7).join(" ");
  const m = janela.match(DOSE);
  return m ? `${m[1].replace(".", ",")} ${m[2]}` : null;
}

export function medicamentosDoTexto(texto: string, catalogo: CatalogoReceita): MedicamentoLido[] {
  const { palavras: indice } = indiceDoCatalogo(catalogo);
  const dasPalavras = palavrasDe(texto);
  const achados = new Map<string, MedicamentoLido>();
  const longas = [...indice.keys()].filter((k) => k.length >= 8);
  dasPalavras.forEach((palavra, posicao) => {
    if (palavra.length < 5 || IGNORAR.has(palavra) || /\d/.test(palavra)) return;
    let nome = indice.get(palavra) ?? null;
    if (!nome && palavra.length >= 8) {
      const parecida = longas.find((k) => distanciaAte1(palavra, k));
      if (parecida) nome = indice.get(parecida) ?? null;
    }
    if (!nome) return;
    const dosagem = doseApos(dasPalavras, posicao);
    const anterior = achados.get(nome);
    if (!anterior || (!anterior.dosagem && dosagem)) {
      achados.set(nome, { nome: nome.charAt(0).toUpperCase() + nome.slice(1), dosagem });
    }
  });
  return [...achados.values()].slice(0, 15);
}

const UNIDADES = new Set(["mg", "mcg", "ui", "g", "ml"]);

/**
 * Nomes que aparecem na receita colados a uma dose ("Xarelto 20 mg") mas não existem no catálogo da loja.
 * Entram na lista como "não encontrado" para a pessoa saber que falta remédio e falar com o farmacêutico.
 * Só vale quando já achamos ao menos um remédio (senão o leitor local nem é usado).
 */
export function remediosForaDoCatalogo(texto: string, catalogo: CatalogoReceita, jaAchados: readonly MedicamentoLido[]): MedicamentoLido[] {
  const { palavras: indice } = indiceDoCatalogo(catalogo);
  const chaves = [...indice.keys()];
  const conhecidos = new Set(jaAchados.map((m) => normalizarBusca(m.nome)));
  const dasPalavras = palavrasDe(texto);
  const faltando = new Map<string, MedicamentoLido>();
  dasPalavras.forEach((palavra, i) => {
    if (palavra.length < 6 || /\d/.test(palavra) || IGNORAR.has(palavra) || indice.has(palavra) || conhecidos.has(palavra)) return;
    // Palavra logo depois de um remédio que já achamos é complemento do nome (sal, forma), não outro remédio.
    const anterior = dasPalavras[i - 1] ?? "";
    if (indice.has(anterior) || conhecidos.has(anterior)) return;
    if (palavra.length >= 8 && chaves.some((k) => k.length >= 8 && distanciaAte1(palavra, k))) return;
    const t1 = dasPalavras[i + 1] ?? "";
    const t2 = dasPalavras[i + 2] ?? "";
    let dose: string | null = null;
    const colada = t1.match(/^(\d+)(mg|mcg|ui|g|ml)$/);
    if (colada) dose = `${colada[1]} ${colada[2]}`;
    else if (/^\d+$/.test(t1) && UNIDADES.has(t2)) dose = `${t1} ${t2}`;
    if (!dose || faltando.has(palavra)) return;
    faltando.set(palavra, { nome: palavra.charAt(0).toUpperCase() + palavra.slice(1), dosagem: dose });
  });
  return [...faltando.values()].slice(0, 5);
}
