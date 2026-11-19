import { carregarCatalogoCompleto } from "./nacoes-unidas/produtos/catalogo";
import { carregarRestritos } from "./nacoes-unidas/produtos/receita";
import { nomeDeExibicao } from "./nome-exibicao";

/**
 * O catálogo do app usa o nome bruto de cada produto como id; as listas do site usam o nome de exibição.
 * Esta ponte devolve, para cada nome de exibição, o id que o app usa.
 */
export function idsDoAplicativo(): Map<string, string> {
  const ids = new Map<string, string>();
  for (const item of carregarCatalogoCompleto().itens) ids.set(nomeDeExibicao(item.nome), item.nome);
  const restritos = carregarRestritos();
  for (const item of [...restritos.receita, ...restritos.controlados]) ids.set(nomeDeExibicao(item.nome), item.nome);
  return ids;
}
