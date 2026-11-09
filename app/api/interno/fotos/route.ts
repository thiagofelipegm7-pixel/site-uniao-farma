import { lerExportBruto } from "../../../estoque-fonte";
import { chaveDeNome, montarLinhas, resumirFotos, SEM_CATEGORIA } from "../../../fotos-painel";
import { carregarCatalogoCompleto } from "../../../nacoes-unidas/produtos/catalogo";
import { banco, segredo } from "../../../estoque-fonte";
import { listarPendentes, listarRemocoes } from "../../../fotos-enviadas";
import { mapaDeCategorias } from "../../../categoria-override";
import { mapaDeControlados } from "../../../controlado-override";
import { mapaDeNomes, ultimasAlteracoes } from "../../../nomes-corrigidos";
import { FOTOS_NACOES } from "../../../nacoes-unidas/produtos/imagens";
import { carregarRestritos } from "../../../nacoes-unidas/produtos/receita";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

/** Itens de bijuteria que não devem aparecer no painel nem no site. */
const BIJUTERIAS = /^(BRINCO |PIERCING |ANEL |COLAR |PULSEIRA |PINGENTE )/i;

/** Códigos de barras conhecidos que o export do PC ainda não traz. */
const EAN_OVERRIDE: Record<string, string> = {
  "LACTO PURGA C/6 CARTELA": "7896094912472",
};

/** Estoque de agora cruzado com as fotos que já estão no site (painel interno; a senha é pedida pelo middleware). */
export async function GET() {
  const exportado = await lerExportBruto();
  if (!exportado) return Response.json({ ok: false, erro: "sem_dados" }, { status: 502, headers: SEM_CACHE });

  // Remove bijuterias e aplica códigos de barras conhecidos.
  const itens = exportado.itens.filter((it) => {
    const nome = typeof it.Produto === "string" ? it.Produto : "";
    return !BIJUTERIAS.test(nome);
  }).map((it) => {
    const nome = typeof it.Produto === "string" ? it.Produto.replace(/\s+/g, " ").trim() : "";
    const override = EAN_OVERRIDE[nome.toUpperCase()];
    if (override) return { ...it, CodigoDeBarras: override };
    return it;
  });

  const categorias = new Map<string, string>();
  for (const i of carregarCatalogoCompleto().itens) categorias.set(chaveDeNome(i.nome), i.categoria);
  const restritos = carregarRestritos();
  // Produtos especiais (controlados e com receita) entram como Medicamentos; o badge indica o tipo.
  for (const i of restritos.receita) categorias.set(chaveDeNome(i.nome), "Medicamentos");
  for (const i of restritos.controlados) categorias.set(chaveDeNome(i.nome), "Medicamentos");

  const db = banco();
  const categoriasOvr = db ? await mapaDeCategorias(db).catch(() => ({} as Awaited<ReturnType<typeof mapaDeCategorias>>)) : {};
  for (const [k, v] of Object.entries(categoriasOvr)) categorias.set(k, v.categoria);

  const eansComFoto = new Set(Object.values(FOTOS_NACOES));
  const linhas = montarLinhas(itens, eansComFoto, categorias);
  // Fotos já enviadas pelo painel e ainda não publicadas no site.
  const pendentes = db ? (await listarPendentes(db).catch(() => [])).map((f) => f.ean) : [];
  const removidas = db ? (await listarRemocoes(db).catch(() => [])).map((r) => r.ean) : [];
  const nomes = db ? await mapaDeNomes(db).catch(() => ({})) : {};
  const controlados = db ? await mapaDeControlados(db).catch(() => ({})) : {};
  const alteracoes = db ? await ultimasAlteracoes(db).catch(() => []) : [];
  const sistemaRestrito = new Set<string>();
  for (const i of [...restritos.receita, ...restritos.controlados]) sistemaRestrito.add(chaveDeNome(i.nome));
  const listaCategorias = [...new Set(linhas.map((l) => l.categoria))].sort((a, b) => (a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : a.localeCompare(b, "pt-BR")));
  return Response.json(
    {
      ok: true,
      geradoEm: exportado.geradoEm,
      resumo: resumirFotos(linhas),
      categorias: listaCategorias,
      pendentes,
      nomes,
      controlados,
      categoriasOverride: categoriasOvr,
      alteracoes,
      removidas,
      publicacaoRapida: Boolean(segredo("GITHUB_DISPATCH_TOKEN")),
      // Linhas: [..., semCodigo, sistemaRestrito] — sistemaRestrito = receita/controlado do sync (não consulte)
      linhas: linhas.map((l) => [l.ean, l.nome, l.lab, l.classe, l.estoque, l.preco, l.valor, l.controlado ? 1 : 0, l.antimicrobiano ? 1 : 0, l.categoria, l.noSite ? 1 : 0, l.semCodigo ? 1 : 0, sistemaRestrito.has(chaveDeNome(l.nome)) ? 1 : 0]),
    },
    { headers: SEM_CACHE },
  );
}
