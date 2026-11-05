/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import { IconSetaDireita } from "../../reserva/ReservaIcons";
import BarraReserva from "../../shop/BarraReserva";
import ShopTopo from "../../shop/ShopTopo";
import { nomeDeExibicao } from "../../nome-exibicao";
import { buildWhatsAppUrl, SITE_URL, UNITS } from "../../site-config";
import { getPageStructuredData } from "../../structured-data";
import type { GrupoBusca } from "../../nacoes-unidas/produtos/busca";
import CatalogoLista from "../../nacoes-unidas/produtos/CatalogoLista";
import { carregarCatalogoNacoes, formatBRL, slugify } from "../../nacoes-unidas/produtos/catalogo";
import { acharDepartamento, DEPARTAMENTOS } from "../../nacoes-unidas/produtos/departamentos";
import { fotoDoProduto } from "../../nacoes-unidas/produtos/imagens";
import "../../nacoes-unidas/produtos/produtos.css";

export const dynamic = "force-dynamic";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dep = acharDepartamento(slug);
  const titulo = dep ? `${dep.nome} | União Farma Nações Unidas, Sabará` : "Departamento | União Farma";
  const descricao = dep ? `${dep.resumo} Lista de preços da loja Nações Unidas, em Sabará.` : "Departamentos da União Farma.";
  return {
    title: { absolute: titulo },
    description: descricao,
    alternates: { canonical: dep ? `/departamentos/${dep.slug}` : "/nacoes-unidas/produtos" },
    // Departamento provisório (itens ainda sem categoria) fica fora do Google e do sitemap.
    robots: { index: !dep?.provisorio, follow: true },
    openGraph: { title: titulo, description: descricao, url: `${SITE_URL}/departamentos/${dep?.slug ?? ""}`, type: "website", images: ["/og-nacoes-unidas.jpg"] },
  };
}

export default async function DepartamentoPage({ params }: Props) {
  const { slug } = await params;
  const dep = acharDepartamento(slug);
  if (!dep) notFound();

  const whatsappHref = buildWhatsAppUrl(nacoes, `Oi, União Farma Nações Unidas! Vi o departamento ${dep.nome} no site e quero confirmar preço e disponibilidade.`, {
    campaign: "departamento",
    content: dep.slug,
  });

  // A lista já vai no HTML (o Google lê sem precisar rodar JavaScript); o navegador continua filtrando e ordenando.
  const itens = carregarCatalogoNacoes()
    .itens.filter((i) => slugify(i.categoria) === dep.slug)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((i) => ({ nome: nomeDeExibicao(i.nome), lab: i.lab, isMIP: i.isMIP, precoFmt: formatBRL(i.preco), preco: i.preco, foto: fotoDoProduto(i.nome), slug: slugify(i.nome) }));
  if (dep.provisorio && itens.length === 0) notFound(); // nada para conferir: a página não existe
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
      <div className="unit-page landing-page catalogo-nacoes catalogo-loja">
        <nav className="catalogo-caminho section-inner" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <a href="/nacoes-unidas/produtos">Produtos</a>
          <IconSetaDireita size={12} />
          <span>{dep.nome}</span>
        </nav>
        <h1 className="catalogo-titulo section-inner">{dep.nome}</h1>
        <p className="departamento-resumo section-inner">{dep.resumo}</p>
        {dep.slug === "medicamentos" ? (
          <nav className="departamento-receita section-inner" aria-label="Medicamentos com receita">
            <a href="/nacoes-unidas/produtos/receita">Medicamentos com receita</a>
            <a href="/nacoes-unidas/produtos/controlados">Medicamentos controlados</a>
            <a href="/nacoes-unidas/produtos/consulte-o-farmaceutico">Consulte o farmacêutico</a>
          </nav>
        ) : null}
        <nav className="departamento-outros section-inner" aria-label="Departamentos">
          {DEPARTAMENTOS.map((d) => (
            <a key={d.slug} href={`/departamentos/${d.slug}`} aria-current={d.slug === dep.slug ? "page" : undefined}>
              {d.nome}
            </a>
          ))}
        </nav>
        <div className="section-inner" id="lista">
          <CatalogoLista grupos={grupos} departamento={dep.slug} whatsappHref={whatsappHref} unitId={nacoes.id} />
          <aside className="catalogo-aviso" aria-label="Medicamentos com receita e controlados">
            <p>
              <strong>Medicamentos com receita e controlados:</strong> lista de preços, sem venda online. A compra é no balcão, com a receita (retida pela farmácia quando a lei exigir).
            </p>
            <p>
              <a href="/nacoes-unidas/produtos/receita">Ver medicamentos com receita</a> · <a href="/nacoes-unidas/produtos/controlados">Ver medicamentos controlados</a> · <a href="/nacoes-unidas/produtos/consulte-o-farmaceutico">Itens para consultar o farmacêutico</a>
            </p>
          </aside>
          <p className="catalogo-nota">Preços do sistema da loja Nações Unidas. Preço e disponibilidade podem ter mudado: a loja confirma pelo WhatsApp antes da separação.</p>
        </div>
      </div>
      <ContentSiteFooter />
      <BarraReserva />
    </>
  );
}
