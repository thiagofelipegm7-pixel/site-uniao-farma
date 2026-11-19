/**
 * Quando tudo que a busca achou está esgotado, a lista mostra "parecidos em estoque": produtos do mesmo tipo, da mesma marca ou de nome
 * parecido, com foto e preço. Nunca para medicamento (trocar remédio é com o farmacêutico) e nunca repete o que a busca já mostrou.
 */
import { normalizarBusca, precoDoItem, type GrupoBusca, type ItemBusca } from "./busca";

const SEM_VALOR = new Set(["com", "sem", "para", "de", "da", "do", "und", "unid", "unidades", "kit", "fr", "frasco", "cx", "caixa"]);

function palavras(nome: string): Set<string> {
  return new Set(
    normalizarBusca(nome)
      .split(/[^a-z]+/)
      .filter((p) => p.length >= 4 && !SEM_VALOR.has(p)),
  );
}

const ehRemedio = (item: Pick<ItemBusca, "isMIP" | "restrito">, categoria?: string) => Boolean(item.restrito) || item.isMIP === true || categoria === "Medicamentos";

/** Tudo que a busca achou é produto comum e está esgotado (e achou algo). */
export function precisaSimilares(achados: readonly ItemBusca[]): boolean {
  return achados.length > 0 && achados.every((i) => i.esgotado === true && !ehRemedio(i));
}

/** Pontos de parecença entre um esgotado e um candidato em estoque. 4 ou mais já vale como "parecido". */
export function parecenca(ref: ItemBusca, cand: ItemBusca): number {
  let pontos = 0;
  if (ref.tipo && cand.tipo && ref.tipo === cand.tipo) pontos += 4;
  const labRef = normalizarBusca(ref.lab);
  if (labRef && labRef === normalizarBusca(cand.lab)) pontos += 3;
  const a = palavras(ref.nome);
  const b = palavras(cand.nome);
  if (a.size > 0 && b.size > 0) {
    let comuns = 0;
    for (const p of a) if (b.has(p)) comuns += 1;
    pontos += (comuns / (a.size + b.size - comuns)) * 4;
  }
  const pr = precoDoItem(ref);
  const pc = precoDoItem(cand);
  if (pr > 0 && pc > 0) pontos += Math.max(0, 1 - Math.abs(Math.log(pc / pr)));
  return pontos;
}

/** Até `limite` produtos em estoque parecidos com os esgotados achados, do mais para o menos parecido. */
export function similaresEmEstoque(grupos: readonly GrupoBusca[], esgotados: readonly ItemBusca[], limite = 8): ItemBusca[] {
  if (!precisaSimilares(esgotados)) return [];
  const referencias = esgotados.slice(0, 4);
  const jaMostrados = new Set(esgotados.map((i) => normalizarBusca(i.nome)));
  const vistos = new Set<string>();
  const candidatos: { item: ItemBusca; pontos: number }[] = [];
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      if (item.esgotado === true || ehRemedio(item, grupo.categoria) || item.foto === null || precoDoItem(item) <= 0) continue;
      const chave = normalizarBusca(item.nome);
      if (jaMostrados.has(chave) || vistos.has(chave)) continue;
      vistos.add(chave);
      const pontos = Math.max(...referencias.map((r) => parecenca(r, item)));
      if (pontos >= 4) candidatos.push({ item, pontos });
    }
  }
  return candidatos.sort((x, y) => y.pontos - x.pontos || x.item.nome.localeCompare(y.item.nome, "pt-BR")).slice(0, limite).map((c) => c.item);
}
