import referencia from "../dados-referencia/estoque-referencia-100.json" with { type: "json" };
import { eanDaFoto } from "./nacoes-unidas/produtos/imagens";

type ItemReferencia = { nome: string; lab?: string; preco?: number; categoria?: string; restam?: number; classe?: string; controlado?: boolean; antimicrobiano?: boolean };

/**
 * Dados de referência para trabalhar localmente sem o PC da loja (só com ESTOQUE_REFERENCIA=1 no .env).
 * Converte o arquivo de referência para o mesmo formato do export DMaster que a página de fotos já lê.
 */
export function exportReferencia(): { itens: Array<Record<string, unknown>>; geradoEm: string } {
  const lista = ((referencia as { itens?: ItemReferencia[] }).itens ?? []);
  return {
    geradoEm: String((referencia as { geradoEm?: string }).geradoEm ?? new Date().toISOString()),
    itens: lista.map((i) => ({
      Produto: i.nome,
      // Código da foto oficial (public/produtos/<EAN>.webp) pelo nome; sem correspondência fica sem foto.
      CodigoDeBarras: eanDaFoto(i.nome) ?? "",
      Estoque: i.restam ?? 0,
      Pvenda: i.preco ?? 0,
      Laboratorio: i.lab ?? "",
      Classe: i.classe ?? "",
      ProdutoControlado: i.controlado ?? false,
      ProdutoAntimicrobiano: i.antimicrobiano ?? false,
    })),
  };
}
