import { mapaDePalavras } from "./palavras-busca";
import { termosDaConsulta, normalizarBusca } from "./nacoes-unidas/produtos/busca";
import { carregarCatalogoCompleto } from "./nacoes-unidas/produtos/catalogo";
import { ehNbcal } from "./nacoes-unidas/produtos/produto";
import { carregarRestritos } from "./nacoes-unidas/produtos/receita";
import { ehFormulaInfantil } from "./nacoes-unidas/produtos/relacionados";
import { chaveDoNome, type Banco } from "./nomes-corrigidos";

export type ProdutoBuscavel = { nome: string; texto: string };

/** Produtos que NÃO são remédio (as alternativas e os sinônimos aprovados só valem para eles), com o texto em que a busca procura. */
export async function produtosBuscaveis(db: Banco): Promise<{ itens: ProdutoBuscavel[]; vocab: Set<string>; palavrasPrompt: string[] }> {
  const r = carregarRestritos();
  const restritos = new Set([...r.receita, ...r.controlados, ...r.consulte].map((i) => chaveDoNome(i.nome)));
  const palavras = await mapaDePalavras(db).catch(() => ({} as Awaited<ReturnType<typeof mapaDePalavras>>));
  const vistos = new Set<string>();
  const itens: ProdutoBuscavel[] = [];
  for (const i of carregarCatalogoCompleto().itens) {
    const k = chaveDoNome(i.nome);
    if (vistos.has(k)) continue;
    vistos.add(k);
    if (i.isMIP || i.categoria === "Medicamentos" || restritos.has(k) || ehNbcal(i.nome) || ehFormulaInfantil(i.nome)) continue;
    itens.push({ nome: i.nome, texto: normalizarBusca(`${i.nome} ${i.lab} ${i.categoria} ${palavras[k]?.palavras ?? ""}`) });
  }
  // Palavras de 3 a 20 letras dos produtos: todas valem para conferir a resposta da IA; as 1.300 mais comuns vão na lista que ela vê.
  const freq = new Map<string, number>();
  for (const i of itens) for (const w of new Set(i.texto.split(/[^a-z]+/))) if (w.length >= 3 && w.length <= 20) freq.set(w, (freq.get(w) ?? 0) + 1);
  const ordenadas = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([w]) => w);
  return { itens, vocab: new Set(ordenadas), palavrasPrompt: ordenadas.slice(0, 1300) };
}

/** Nomes dos produtos que a busca acha para esta alternativa (todas as palavras, como na busca do site). */
export function produtosDaAlternativa(itens: readonly ProdutoBuscavel[], alternativa: string): string[] {
  const termos = termosDaConsulta(alternativa);
  if (termos.length === 0) return [];
  return itens.filter((i) => termos.every((t) => i.texto.includes(t))).map((i) => i.nome);
}
