import { lerExportBruto } from "../../../estoque-fonte";
import { chaveDeNome, montarLinhas, reconciliarContagens, resumirFotos, SEM_CATEGORIA } from "../../../fotos-painel";
import { carregarCatalogoCompleto, slugify } from "../../../nacoes-unidas/produtos/catalogo";
import { descricaoDoProduto } from "../../../nacoes-unidas/produtos/descricoes";
import mudancasJson from "../../../nacoes-unidas/produtos/dados/mudancas-recentes.json" with { type: "json" };
import { banco, segredo } from "../../../estoque-fonte";
import { listarPendentes, listarRemocoes } from "../../../fotos-enviadas";
import { mapaDeCategorias } from "../../../categoria-override";
import { mapaDeControlados } from "../../../controlado-override";
import { mapaDeMarcas } from "../../../marca-override";
import { mapaDeNomes, ultimasAlteracoes, type Banco } from "../../../nomes-corrigidos";
import { mapaDeRemovidos } from "../../../produtos-removidos";
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

type Mudanca = { q: string; t: string; n: string; c: string; de?: number; para?: number };

/** O que mudou no catálogo nos últimos 7 dias (novo, esgotou, voltou, preço), do mais novo para o mais antigo. Escrito pela sincronização; sem estoque nem código de barras. */
function mudancasRecentes(agora = Date.now()): Mudanca[] {
  const lista = Array.isArray((mudancasJson as { eventos?: unknown }).eventos) ? ((mudancasJson as { eventos: Mudanca[] }).eventos) : [];
  const desde = agora - 7 * 24 * 3600 * 1000;
  return lista.filter((e) => typeof e?.q === "string" && Date.parse(e.q) >= desde).slice(-600).reverse();
}

/** Estoque de agora cruzado com as fotos que já estão no site (painel interno; a senha é pedida pelo middleware). */
export async function GET() {
  const exportado = await lerExportBruto();
  if (!exportado) return Response.json({ ok: false, erro: "sem_dados" }, { status: 502, headers: SEM_CACHE });

  // Remove bijuterias e aplica códigos de barras conhecidos.
  const db = banco();
  const removidos = new Set<string>();
  // Excluídos pelo painel (por nome): somem do painel na hora e a sincronização os tira do site.
  const removidosNomes = db ? new Set(Object.keys(await mapaDeRemovidos(db).catch(() => ({})))) : new Set<string>();
  if (db) {
    try {
      // Tabela antiga (por código de barras), de antes da exclusão por nome: só some do painel, não saía do site.
      const { results } = await (db as Banco).prepare("SELECT ean FROM produtos_removidos").bind().all<{ ean: string }>();
      for (const r of results) if (typeof r.ean === "string") removidos.add(r.ean);
    } catch {}
  }
  const itens = exportado.itens.filter((it) => {
    const nome = typeof it.Produto === "string" ? it.Produto : "";
    const ean = typeof it.CodigoDeBarras === "string" ? it.CodigoDeBarras : "";
    return !BIJUTERIAS.test(nome) && !removidos.has(ean) && !removidosNomes.has(chaveDeNome(nome));
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

  const categoriasOvr = db ? await mapaDeCategorias(db).catch(() => ({} as Awaited<ReturnType<typeof mapaDeCategorias>>)) : {};
  for (const [k, v] of Object.entries(categoriasOvr)) categorias.set(k, v.categoria);

  const eansComFoto = new Set(Object.values(FOTOS_NACOES));
  const linhas = montarLinhas(itens, eansComFoto, categorias);
  // Fotos já enviadas pelo painel e ainda não publicadas no site.
  const pendentes = db ? (await listarPendentes(db).catch(() => [])).map((f) => f.ean) : [];
  const removidas = db ? (await listarRemocoes(db).catch(() => [])).map((r) => r.ean) : [];
  const nomes = db ? await mapaDeNomes(db).catch(() => ({})) : {};
  const controlados = db ? await mapaDeControlados(db).catch(() => ({})) : {};
  const marcasOverride = db ? await mapaDeMarcas(db).catch(() => ({})) : {};
  const alteracoes = db ? await ultimasAlteracoes(db).catch(() => []) : [];
  const sistemaRestrito = new Set<string>();
  for (const i of [...restritos.receita, ...restritos.controlados]) sistemaRestrito.add(chaveDeNome(i.nome));
  // Produtos que já têm texto de pesquisa ou de IA na página (para o filtro "Sem descrição"; sem o texto em si, só o código).
  const comDescricao = linhas.filter((l) => { const d = descricaoDoProduto(slugify(l.nome)); return d !== null && d.origem !== "modelo"; }).map((l) => l.ean);
  const listaCategorias = [...new Set(linhas.map((l) => l.categoria))].sort((a, b) => (a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : a.localeCompare(b, "pt-BR")));
  return Response.json(
    {
      ok: true,
      geradoEm: exportado.geradoEm,
      resumo: resumirFotos(linhas),
      // Como os números fecham: PC, o que o site lista e o que o painel conta (sem quantidades em estoque).
      reconciliacao: reconciliarContagens(exportado.itens, carregarCatalogoCompleto().itens.length + restritos.receita.length + restritos.controlados.length),
      categorias: listaCategorias,
      pendentes,
      nomes,
      controlados,
      categoriasOverride: categoriasOvr,
      marcasOverride,
      comDescricao,
      mudancas: mudancasRecentes(),
      alteracoes,
      removidas,
      publicacaoRapida: Boolean(segredo("GITHUB_DISPATCH_TOKEN")),
      // Linhas: [..., semCodigo, sistemaRestrito] — sistemaRestrito = receita/controlado do sync (não consulte)
      linhas: linhas.map((l) => [l.ean, l.nome, l.lab, l.classe, l.estoque, l.preco, l.valor, l.controlado ? 1 : 0, l.antimicrobiano ? 1 : 0, l.categoria, l.noSite ? 1 : 0, l.semCodigo ? 1 : 0, sistemaRestrito.has(chaveDeNome(l.nome)) ? 1 : 0]),
    },
    { headers: SEM_CACHE },
  );
}
