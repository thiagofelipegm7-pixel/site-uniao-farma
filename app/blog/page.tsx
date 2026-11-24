/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos, como no restante do site. */
import type { Metadata } from "next";
import { ContentSiteFooter, ContentSiteHeader } from "../ContentSiteChrome";
import { SITE_URL } from "../site-config";
import { artigosPublicados, dataCurta, nomeDoTema, TEMAS, type Artigo } from "./blog-conteudo";
import "./blog.css";

const titulo = "Blog de saúde e bem-estar | União Farma em Sabará";
const descricao = "Dicas de saúde, medicamentos, alimentação e bem-estar da União Farma em Sabará. Informação geral: não substitui a consulta com o médico.";

export const metadata: Metadata = {
  title: { absolute: titulo },
  description: descricao,
  alternates: { canonical: "/blog" },
  openGraph: { title: titulo, description: descricao, url: `${SITE_URL}/blog`, type: "website" },
};

function CartaoArtigo({ artigo }: { artigo: Artigo }) {
  return (
    <article className="blog-cartao">
      <div className="blog-cartao-foto">
        {artigo.imagem ? <img src={artigo.imagem} alt="" loading="lazy" width="640" height="480" /> : null}
        <span className="blog-cartao-tag">{nomeDoTema(artigo.tema)}</span>
      </div>
      <div className="blog-cartao-meta">
        <time dateTime={artigo.publicadoEm}>{dataCurta(artigo.publicadoEm)}</time>
      </div>
      <h3><a href={`/blog/${artigo.slug}`}>{artigo.titulo}</a></h3>
      <p>{artigo.resumo}</p>
    </article>
  );
}

export default function BlogPage() {
  const publicados = artigosPublicados();
  const recentes = publicados.slice(0, 7);

  return (
    <>
      <ContentSiteHeader />
      <div className="blog-pagina">
        <nav className="blog-migalhas section-inner" aria-label="Navegação estrutural">
          <a href="/">Início</a>
          <span aria-hidden="true">/</span>
          <span>Blog</span>
        </nav>

        <section className="blog-topo section-inner" aria-labelledby="blog-titulo">
          <p className="blog-kicker">Blog União Farma</p>
          <h1 id="blog-titulo">Saúde e bem-estar em Sabará</h1>
          <p>Informações gerais sobre saúde, medicamentos e rotina. Para o seu caso, converse com o médico ou com o farmacêutico.</p>
          <nav className="blog-temas" aria-label="Temas do blog">
            {TEMAS.map((t) => (
              <a key={t.slug} href={`#tema-${t.slug}`}>{t.nome}</a>
            ))}
          </nav>
        </section>

        <section className="blog-secao section-inner" aria-labelledby="blog-popular">
          <h2 id="blog-popular">Popular</h2>
          {recentes.length > 0 ? (
            <div className="blog-carrossel">
              {recentes.map((a) => <CartaoArtigo key={a.slug} artigo={a} />)}
            </div>
          ) : (
            <p className="blog-vazio">Em breve.</p>
          )}
        </section>

        <section className="blog-secao section-inner" aria-labelledby="blog-ultimos">
          <h2 id="blog-ultimos">Últimos conteúdos</h2>
          {publicados.length > 0 ? (
            <div className="blog-lista">
              {publicados.slice(0, 3).map((a) => <CartaoArtigo key={a.slug} artigo={a} />)}
            </div>
          ) : (
            <p className="blog-vazio" role="status">Os primeiros textos estão sendo preparados e serão publicados em breve.</p>
          )}
        </section>

        {TEMAS.map((t) => {
          const doTema = publicados.filter((a) => a.tema === t.slug);
          return (
            <section key={t.slug} id={`tema-${t.slug}`} className="blog-secao section-inner" aria-labelledby={`tema-titulo-${t.slug}`}>
              <h2 id={`tema-titulo-${t.slug}`}>{t.nome}</h2>
              {doTema.length > 0 ? (
                <div className="blog-carrossel">
                  {doTema.slice(0, 7).map((a) => <CartaoArtigo key={a.slug} artigo={a} />)}
                </div>
              ) : (
                <p className="blog-vazio">Em breve.</p>
              )}
            </section>
          );
        })}

      </div>
      <ContentSiteFooter notice="Os conteúdos deste blog são informativos e não substituem a orientação de um médico ou farmacêutico." />
    </>
  );
}
