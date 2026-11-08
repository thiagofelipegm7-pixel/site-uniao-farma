import { diferencasDeEstoque, type Mudancas } from "../../disponibilidade";
import { lerEstoqueAtual } from "../../estoque-fonte";
import { carregarCatalogoCompleto, slugify } from "../../nacoes-unidas/produtos/catalogo";

export const dynamic = "force-dynamic";

const VALIDADE_MS = 30_000;
let guardado: { quando: number; contatoEm: string | null; mudou: Mudancas } | null = null;

/** O que mudou no estoque desde a última publicação do catálogo (só níveis: 0 acabou, 1 a 5 restam, 6 seis ou mais). Público, sem quantidades exatas. */
export async function GET() {
  const agora = Date.now();
  if (!guardado || agora - guardado.quando > VALIDADE_MS) {
    const atual = await lerEstoqueAtual();
    if (!atual) {
      // PC/Worker fora do ar: sem dado novo, o site segue com o catálogo publicado (a cesta não bloqueia nada).
      return Response.json({ ok: false }, { headers: { "cache-control": "public, max-age=15" } });
    }
    const vivo = new Map<string, number>();
    for (const i of atual.itens) vivo.set(slugify(i.nome), i.estoque);
    const publicado = new Map<string, { esgotado?: boolean; restam?: number }>();
    for (const i of carregarCatalogoCompleto().itens) publicado.set(slugify(i.nome), i);
    guardado = { quando: agora, contatoEm: atual.contatoEm, mudou: diferencasDeEstoque(vivo, publicado) };
  }
  return Response.json({ ok: true, geradoEm: guardado.contatoEm, mudou: guardado.mudou }, { headers: { "cache-control": "public, max-age=15" } });
}
