import { lerExportBruto } from "../../../estoque-fonte";
import { chaveDeNome, montarLinhas, resumirFotos, SEM_CATEGORIA } from "../../../fotos-painel";
import { carregarCatalogoCompleto } from "../../../nacoes-unidas/produtos/catalogo";
import { banco, segredo } from "../../../estoque-fonte";
import { listarPendentes, listarRemocoes } from "../../../fotos-enviadas";
import { FOTOS_NACOES } from "../../../nacoes-unidas/produtos/imagens";
import { carregarRestritos } from "../../../nacoes-unidas/produtos/receita";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Estoque de agora cruzado com as fotos que já estão no site (painel interno; a senha é pedida pelo middleware). */
export async function GET() {
  const exportado = await lerExportBruto();
  if (!exportado) return Response.json({ ok: false, erro: "sem_dados" }, { status: 502, headers: SEM_CACHE });

  const categorias = new Map<string, string>();
  for (const i of carregarCatalogoCompleto().itens) categorias.set(chaveDeNome(i.nome), i.categoria);
  const restritos = carregarRestritos();
  for (const i of restritos.receita) if (!categorias.has(chaveDeNome(i.nome))) categorias.set(chaveDeNome(i.nome), "Com receita");
  for (const i of restritos.controlados) if (!categorias.has(chaveDeNome(i.nome))) categorias.set(chaveDeNome(i.nome), "Controlados");

  const eansComFoto = new Set(Object.values(FOTOS_NACOES));
  const linhas = montarLinhas(exportado.itens, eansComFoto, categorias);
  // Fotos já enviadas pelo painel e ainda não publicadas no site.
  const db = banco();
  const pendentes = db ? (await listarPendentes(db).catch(() => [])).map((f) => f.ean) : [];
  const removidas = db ? (await listarRemocoes(db).catch(() => [])).map((r) => r.ean) : [];
  const listaCategorias = [...new Set(linhas.map((l) => l.categoria))].sort((a, b) => (a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : a.localeCompare(b, "pt-BR")));
  return Response.json(
    {
      ok: true,
      geradoEm: exportado.geradoEm,
      resumo: resumirFotos(linhas),
      categorias: listaCategorias,
      pendentes,
      removidas,
      publicacaoRapida: Boolean(segredo("GITHUB_DISPATCH_TOKEN")),
      // Linhas em lista (não objetos) para a resposta ficar pequena: [ean, nome, lab, classe, estoque, preco, valor, controlado, antimicrobiano, categoria, noSite]
      linhas: linhas.map((l) => [l.ean, l.nome, l.lab, l.classe, l.estoque, l.preco, l.valor, l.controlado ? 1 : 0, l.antimicrobiano ? 1 : 0, l.categoria, l.noSite ? 1 : 0, l.semCodigo ? 1 : 0]),
    },
    { headers: SEM_CACHE },
  );
}
