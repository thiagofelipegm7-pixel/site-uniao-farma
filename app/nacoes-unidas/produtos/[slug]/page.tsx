/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../../ContentSiteChrome";
import ShopTopo from "../../../shop/ShopTopo";
import { SITE_URL, UNITS } from "../../../site-config";
import { IconSelo, IconSetaDireita } from "../../../reserva/ReservaIcons";
import { acharPorSlug, fetchCatalogoNacoes, formatBRL, slugify } from "../catalogo";
import { fotoDoProduto } from "../imagens";
import ProdutoBarra from "../ProdutoBarra";
import { AVISO_MIP, conteudoDoNome, descricaoMetadata, FAQ_PRODUTO, jsonLdProduto, NOTA_PRECO, textosPublicaveis } from "../produto";
import "../produtos.css";

export const dynamic = "force-dynamic";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalogo = await fetchCatalogoNacoes();
  const item = catalogo ? acharPorSlug(catalogo.itens, slug) : null;
  const titulo = item ? `${item.nome} | União Farma Nações Unidas` : "Produto | União Farma Nações Unidas";
  const descricao = item ? descricaoMetadata(item.nome) : "Produto da União Farma Nações Unidas, em Sabará.";
  return {
    title: { absolute: titulo },
    description: descricao,
    alternates: { canonical: item ? `/nacoes-unidas/produtos/${slugify(item.nome)}` : "/nacoes-unidas/produtos" },
    robots: { index: false, follow: false },
    openGraph: { title: titulo, description: descricao, url: item ? `${SITE_URL}/nacoes-unidas/produtos/${slugify(item.nome)}` : `${SITE_URL}/nacoes-unidas/produtos`, type: "website" },
  };
}

export default async function ProdutoNacoesPage({ params }: Props) {
  const { slug } = await params;
  const catalogo = await fetchCatalogoNacoes();
  const item = catalogo ? acharPorSlug(catalogo.itens, slug) : null;
  if (!item) notFound();

  const slugItem = slugify(item.nome);
  const pagina = `${SITE_URL}/nacoes-unidas/produtos/${slugItem}`;
  const foto = fotoDoProduto(item.nome);
  const conteudo = conteudoDoNome(item.nome);
  const textos = textosPublicaveis(null);
  const ficha = [
    item.lab.trim() ? { rotulo: "Marca", valor: item.lab.trim() } : null,
    { rotulo: "Categoria", valor: item.categoria },
    conteudo ? { rotulo: "Conteúdo/volume", valor: conteudo } : null,
  ].filter((linha): linha is { rotulo: string; valor: string } => linha !== null);
  const jsonLd = jsonLdProduto({
    nome: item.nome,
    lab: item.lab,
    categoria: item.categoria,
    url: pagina,
    image: foto ? `${SITE_URL}${foto}` : null,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ShopTopo />
      <div className="unit-page landing-page catalogo-nacoes produto-pagina">
        <nav className="catalogo-caminho section-inner produto-caminho" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <a href={`/nacoes-unidas/produtos#${slugify(item.categoria)}`}>{item.categoria}</a>
          <IconSetaDireita size={12} />
          <span>{item.nome}</span>
        </nav>

        <div className="produto-foto">
          {foto ? (
            <img src={foto} alt={item.nome} width="300" height="300" />
          ) : (
            <span className="produto-foto-vazia">Sem foto</span>
          )}
        </div>

        <article className="produto-card section-inner">
          <p className="produto-selo">
            <IconSelo size={18} />
            Sem receita
          </p>
          <h1>{item.nome}</h1>
          {textos.descricao ? <p className="produto-descricao">{textos.descricao}</p> : null}
          {item.lab.trim() ? (
            <p className="produto-marca">
              <strong>Marca:</strong> {item.lab.trim()}
            </p>
          ) : null}
          {item.isMIP ? <p className="catalogo-mip">{AVISO_MIP}</p> : null}
          <p className="produto-preco">{formatBRL(item.preco)}</p>
          <p className="produto-nota">{NOTA_PRECO}</p>
        </article>

        {textos.paraQueServe ? (
          <section className="produto-secao section-inner" aria-labelledby="para-que-serve">
            <h2 id="para-que-serve">Para que serve</h2>
            <p>{textos.paraQueServe}</p>
          </section>
        ) : null}

        {textos.destaques ? (
          <section className="produto-secao section-inner" aria-labelledby="destaques-rotulo">
            <h2 id="destaques-rotulo">Destaques do rótulo</h2>
            <p>{textos.destaques}</p>
          </section>
        ) : null}

        <section className="produto-secao section-inner" aria-labelledby="ficha-tecnica">
          <h2 id="ficha-tecnica">Ficha técnica</h2>
          <table className="produto-ficha">
            <tbody>
              {ficha.map((linha) => (
                <tr key={linha.rotulo}>
                  <th scope="row">{linha.rotulo}</th>
                  <td>{linha.valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="produto-secao section-inner" aria-labelledby="faq-produto">
          <h2 id="faq-produto">Perguntas frequentes</h2>
          <div className="produto-faq">
            {FAQ_PRODUTO.map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
      <ContentSiteFooter />
      <ProdutoBarra unitId={nacoes.id} nome={item.nome} precoCentavos={Math.round(item.preco * 100)} foto={foto} />
    </>
  );
}
