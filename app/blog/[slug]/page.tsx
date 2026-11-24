/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos, como no restante do site. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter, ContentSiteHeader } from "../../ContentSiteChrome";
import { SITE_URL } from "../../site-config";
import { artigoPublicado, artigosPublicados, dataCurta, nomeDoTema } from "../blog-conteudo";
import "../blog.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return artigosPublicados().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artigo = artigoPublicado(slug);
  if (!artigo) return { title: "Artigo não encontrado" };
  const url = `${SITE_URL}/blog/${artigo.slug}`;
  return {
    title: { absolute: `${artigo.titulo} | Blog União Farma` },
    description: artigo.resumo,
    alternates: { canonical: url },
    openGraph: { title: artigo.titulo, description: artigo.resumo, url, type: "article", publishedTime: artigo.publicadoEm },
  };
}

export default async function ArtigoPage({ params }: Props) {
  const { slug } = await params;
  const artigo = artigoPublicado(slug);
  if (!artigo) notFound();

  return (
    <>
      <ContentSiteHeader />
      <div className="blog-pagina">
        <nav className="blog-migalhas section-inner" aria-label="Navegação estrutural">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <a href="/blog">Blog</a>
          <span aria-hidden="true">/</span>
          <span>{nomeDoTema(artigo.tema)}</span>
        </nav>
        <article className="blog-artigo section-inner">
          <header>
            <p className="blog-kicker">{nomeDoTema(artigo.tema)} · <time dateTime={artigo.publicadoEm}>{dataCurta(artigo.publicadoEm)}</time></p>
            <h1>{artigo.titulo}</h1>
            <p className="blog-resumo">{artigo.resumo}</p>
          </header>
          <div className="blog-corpo">
            {artigo.corpo.map((b, i) => (b.tipo === "titulo" ? <h2 key={i}>{b.texto}</h2> : <p key={i}>{b.texto}</p>))}
          </div>
          <aside className="blog-aviso" role="note">
            Este texto é informativo e não substitui a consulta com o médico. Em caso de dúvida sobre medicamentos, fale com o farmacêutico.
          </aside>
        </article>
      </div>
      <ContentSiteFooter />
    </>
  );
}
