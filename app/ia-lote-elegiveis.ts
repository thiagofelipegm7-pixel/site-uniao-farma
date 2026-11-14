/** Escolhe os produtos que ainda não têm descrição de verdade e podem receber sugestão de IA (nunca medicamento, controlado, NBCAL nem fórmula infantil). */
import { chaveDoNome } from "./nomes-corrigidos";
import { slugify, type CatalogoItem } from "./nacoes-unidas/produtos/catalogo";
import { descricaoDoProduto } from "./nacoes-unidas/produtos/descricoes";
import { ehNbcal } from "./nacoes-unidas/produtos/produto";
import { ehFormulaInfantil } from "./nacoes-unidas/produtos/relacionados";

export type EntradaElegiveis = {
  itens: readonly Pick<CatalogoItem, "nome" | "categoria" | "isMIP" | "preco">[];
  restritos: readonly string[];
  jaTratadas: ReadonlySet<string>;
  comDescricaoPainel: ReadonlySet<string>;
  temFoto: (nome: string) => boolean;
};

export function elegiveis(e: EntradaElegiveis): string[] {
  const restritos = new Set(e.restritos.map(chaveDoNome));
  const vistos = new Set<string>();
  const saida: { nome: string; foto: boolean }[] = [];
  for (const i of e.itens) {
    if (!(i.preco > 0)) continue;
    const slug = slugify(i.nome);
    if (vistos.has(slug)) continue;
    vistos.add(slug);
    const chave = chaveDoNome(i.nome);
    if (e.jaTratadas.has(chave) || e.comDescricaoPainel.has(chave) || restritos.has(chave)) continue;
    if (i.isMIP || i.categoria === "Medicamentos" || ehNbcal(i.nome) || ehFormulaInfantil(i.nome)) continue;
    const d = descricaoDoProduto(slug);
    if (d && d.origem !== "modelo") continue;
    saida.push({ nome: i.nome, foto: e.temFoto(i.nome) });
  }
  // Quem tem foto vem primeiro: é o que o cliente mais vê.
  return saida.sort((a, b) => Number(b.foto) - Number(a.foto)).map((x) => x.nome);
}
