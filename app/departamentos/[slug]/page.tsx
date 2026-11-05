/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import { IconSetaDireita } from "../../reserva/ReservaIcons";
import BarraReserva from "../../shop/BarraReserva";
import ShopTopo from "../../shop/ShopTopo";
import { buildWhatsAppUrl, SITE_URL, UNITS } from "../../site-config";
import CatalogoLista from "../../nacoes-unidas/produtos/CatalogoLista";
import { acharDepartamento, DEPARTAMENTOS } from "../../nacoes-unidas/produtos/departamentos";
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
    // Como o catálogo: fica fora do Google até o dono aprovar.
    robots: { index: false, follow: false },
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

  return (
    <>
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
        <nav className="departamento-outros section-inner" aria-label="Departamentos">
          {DEPARTAMENTOS.map((d) => (
            <a key={d.slug} href={`/departamentos/${d.slug}`} aria-current={d.slug === dep.slug ? "page" : undefined}>
              {d.nome}
            </a>
          ))}
        </nav>
        <div className="section-inner" id="lista">
          <CatalogoLista grupos={[]} departamento={dep.slug} whatsappHref={whatsappHref} unitId={nacoes.id} />
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
