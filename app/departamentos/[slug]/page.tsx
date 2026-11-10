/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import { IconSetaDireita } from "../../reserva/ReservaIcons";
import BarraReserva from "../../shop/BarraReserva";
import { MarcasLinha } from "../../shop/MarcasLinha";
import { MARCAS_MEDICAMENTOS } from "../../shop/marcas";
import PainelBanners from "../../shop/PainelBanners";
import ShopTopo from "../../shop/ShopTopo";
import { nomeDeExibicao } from "../../nome-exibicao";
import { buildWhatsAppUrl, SITE_URL, PUBLIC_UNITS } from "../../site-config";
import { getPageStructuredData } from "../../structured-data";
import type { GrupoBusca } from "../../nacoes-unidas/produtos/busca";
import CatalogoLista from "../../nacoes-unidas/produtos/CatalogoLista";
import MedicamentosTodos from "../../nacoes-unidas/produtos/MedicamentosTodos";
import { carregarCatalogoCompleto, formatBRL, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { acharDepartamento } from "../../nacoes-unidas/produtos/departamentos";
import { tipoDoProduto } from "../../nacoes-unidas/produtos/arvore-categorias";
import { fotoExibida } from "../../nacoes-unidas/produtos/foto-exibida";
import "../../nacoes-unidas/produtos/produtos.css";

export const dynamic = "force-dynamic";

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes")!;

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ pagina?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const depRaw = acharDepartamento(slug);
  const dep = depRaw && !depRaw.provisorio ? depRaw : null; // provisório (ex.: a conferir) não é página pública
  const titulo = dep ? `${dep.nome} | União Farma Nações Unidas, Sabará` : "Departamento | União Farma";
  const descricao = dep ? `${dep.resumo} Lista de preços da loja Nações Unidas, em Sabará.` : "Departamentos da União Farma.";
  return {
    title: { absolute: titulo },
    description: descricao,
    alternates: { canonical: dep ? `/departamentos/${dep.slug}` : "/nacoes-unidas/produtos" },
    robots: { index: Boolean(dep), follow: true },
    openGraph: { title: titulo, description: descricao, url: `${SITE_URL}/departamentos/${dep?.slug ?? ""}`, type: "website", images: ["/og-nacoes-unidas.jpg"] },
  };
}

export default async function DepartamentoPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const bruto = (await searchParams)?.pagina;
  const paginaPedida = Math.max(1, Math.floor(Number(Array.isArray(bruto) ? bruto[0] : bruto)) || 1);
  const dep = acharDepartamento(slug);
  if (!dep || dep.provisorio) notFound(); // categoria interna (ex.: a conferir) não tem página pública

  const whatsappHref = buildWhatsAppUrl(nacoes, `Oi, União Farma Nações Unidas! Vi o departamento ${dep.nome} no site e quero confirmar preço e disponibilidade.`, {
    campaign: "departamento",
    content: dep.slug,
  });

  // A lista já vai no HTML (o Google lê sem precisar rodar JavaScript); o navegador continua filtrando e ordenando.
  // Esgotados aparecem depois dos que têm estoque, com o selo "Esgotado".
  const itens = carregarCatalogoCompleto()
    .itens.filter((i) => slugify(i.categoria) === dep.slug)
    .sort((a, b) => Number(a.esgotado === true) - Number(b.esgotado === true) || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((i) => ({ nome: nomeDeExibicao(i.nome), lab: i.lab, isMIP: i.isMIP, restam: i.restam, ...(i.esgotado ? { esgotado: true } : {}), precoFmt: formatBRL(i.preco), preco: i.preco, foto: fotoExibida(i.nome, i.categoria), slug: slugify(i.nome), tipo: tipoDoProduto(i.nome, i.categoria) }));
  const grupos: GrupoBusca[] = [{ categoria: dep.nome, id: dep.slug, itens }];
  const pagina = `${SITE_URL}/departamentos/${dep.slug}`;
  const structuredData = getPageStructuredData({
    name: `${dep.nome} | União Farma Nações Unidas`,
    url: pagina,
    units: [nacoes],
    breadcrumbs: [
      { name: "Início", url: `${SITE_URL}/` },
      { name: "Produtos", url: `${SITE_URL}/nacoes-unidas/produtos` },
      { name: dep.nome, url: pagina },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ShopTopo />
      <PainelBanners />
      <div className="unit-page landing-page catalogo-nacoes catalogo-loja">
        <nav className="catalogo-caminho section-inner" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <a href="/nacoes-unidas/produtos">Produtos</a>
          <IconSetaDireita size={12} />
          <span>{dep.nome}</span>
        </nav>
        <h1 className="catalogo-titulo section-inner">{dep.nome}</h1>
        <div className="section-inner marcas-pagina">
          <MarcasLinha marcas={dep.slug === "medicamentos" ? MARCAS_MEDICAMENTOS : undefined} />
        </div>
        
        <div className="section-inner" id="lista">
          {dep.slug === "medicamentos" ? (
            <MedicamentosTodos paginaInicial={paginaPedida} otcInicial={itens.map((i) => ({ nome: i.nome, slug: i.slug, lab: i.lab, precoFmt: i.precoFmt, foto: i.foto, isMIP: i.isMIP, esgotado: i.esgotado }))} unitId={nacoes.id} />
          ) : (
            <CatalogoLista paginaInicial={paginaPedida} grupos={grupos} departamento={dep.slug} whatsappHref={whatsappHref} unitId={nacoes.id} />
          )}
        </div>
      </div>
      <ContentSiteFooter />
      <BarraReserva />
    </>
  );
}
