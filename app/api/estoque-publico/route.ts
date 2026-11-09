import { lerExportBruto } from "../../estoque-fonte";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Estoque público: todos os produtos com estoque > 0 do PC da loja. */
export async function GET() {
  const exportado = await lerExportBruto();
  if (!exportado) return Response.json({ ok: false, itens: [] }, { status: 502, headers: SEM_CACHE });

  const itens = exportado.itens
    .filter((it) => {
      const nome = typeof it.Produto === "string" ? it.Produto : "";
      const estoque = typeof it.Estoque === "number" ? it.Estoque : 0;
      const preco = typeof it.Pvenda === "number" ? it.Pvenda : 0;
      return nome && estoque > 0 && preco > 0;
    })
    .map((it) => ({
      nome: String(it.Produto).replace(/\s+/g, " ").trim(),
      lab: typeof it.Laboratorio === "string" ? it.Laboratorio : "",
      preco: typeof it.Pvenda === "number" ? it.Pvenda : 0,
      estoque: typeof it.Estoque === "number" ? it.Estoque : 0,
    }));

  return Response.json({ ok: true, total: itens.length, itens }, { headers: SEM_CACHE });
}
