import { carregarCatalogoNacoes, slugify } from "../../nacoes-unidas/produtos/catalogo";

export const dynamic = "force-dynamic";

/** "UNILEVER LTDA" → "Unilever Ltda". Só para exibição. */
function paraTitulo(texto: string): string {
  return texto.toLowerCase().replace(/(^|[\s/.-])([a-zà-ú])/g, (_m, sep: string, letra: string) => sep + letra.toUpperCase());
}

/**
 * Segundo nível da gaveta "Departamentos": as marcas (laboratório/fabricante) mais frequentes de uma categoria do catálogo.
 * `?grupo=<slug da categoria>`. Só dados reais do catálogo; sem marca vazia.
 */
export async function GET(request: Request) {
  const grupo = (new URL(request.url).searchParams.get("grupo") ?? "").slice(0, 80);
  const contagem = new Map<string, number>();
  for (const item of carregarCatalogoNacoes().itens) {
    if (grupo && slugify(item.categoria) !== grupo) continue;
    const marca = item.lab.replace(/\s+/g, " ").trim();
    if (marca.length < 2 || /[&-]$/.test(marca)) continue; // nomes cortados no catálogo (ex.: "JOHNSON &")
    contagem.set(marca, (contagem.get(marca) ?? 0) + 1);
  }
  const marcas = [...contagem.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 12)
    .map(([nome, qtd]) => ({ nome: paraTitulo(nome), busca: nome, qtd }));
  return Response.json({ marcas }, { headers: { "cache-control": "public, max-age=300" } });
}
