import { fotoDoProduto } from "./imagens";
import { ilustracaoSemReceita } from "./receita";

/**
 * Imagem que aparece no cartão: a foto aprovada do produto; sem foto, medicamento (categoria "Medicamentos")
 * usa a ilustração da caixa com a forma do produto ("imagem meramente ilustrativa"). Outras categorias seguem sem imagem.
 */
export function fotoExibida(nome: string, categoria: string): string | null {
  return fotoDoProduto(nome) ?? (categoria === "Medicamentos" ? ilustracaoSemReceita(nome) : null);
}
