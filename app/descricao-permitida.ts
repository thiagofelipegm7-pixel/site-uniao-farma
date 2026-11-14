import { chaveDoNome } from "./descricao-override";
import { carregarCatalogoCompleto } from "./nacoes-unidas/produtos/catalogo";
import { ehNbcal } from "./nacoes-unidas/produtos/produto";
import { carregarRestritos } from "./nacoes-unidas/produtos/receita";
import { ehFormulaInfantil } from "./nacoes-unidas/produtos/relacionados";

/** Medicamento (com ou sem receita), NBCAL e fórmula infantil não têm descrição escrita à mão nem por IA: dependem de decisão do responsável técnico. */
export function descricaoNaoPermitida(original: string): boolean {
  const chave = chaveDoNome(original);
  if (ehNbcal(original) || ehFormulaInfantil(original)) return true;
  const item = carregarCatalogoCompleto().itens.find((i) => chaveDoNome(i.nome) === chave);
  if (item && (item.isMIP || item.categoria === "Medicamentos")) return true;
  const r = carregarRestritos();
  return [...r.receita, ...r.controlados, ...r.consulte].some((i) => chaveDoNome(i.nome) === chave);
}
