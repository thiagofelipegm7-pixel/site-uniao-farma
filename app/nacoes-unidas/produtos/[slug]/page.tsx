/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../../ContentSiteChrome";
import ShopTopo from "../../../shop/ShopTopo";
import { SITE_URL, UNITS } from "../../../site-config";
import { IconSetaDireita } from "../../../reserva/ReservaIcons";
import Preco from "../Preco";
import SemFoto from "../SemFoto";
import { acharPorSlug, carregarCatalogoCompleto, carregarCatalogoNacoes, formatBRL, slugify } from "../catalogo";
import { carregarRestritos } from "../receita";
import { acharDepartamento } from "../departamentos";
import { fotoDoProduto } from "../imagens";
import { fotoExibida } from "../foto-exibida";
import ProdutoAcoes from "../ProdutoAcoes";
import ProdutoBarra from "../ProdutoBarra";
import { nomeDeExibicao } from "../../../nome-exibicao";
import CombinaCom, { itensCombinaCom } from "../CombinaCom";
import { descricaoPublica } from "../descricoes";
import { conteudoDoNome, ehNbcal, descricaoMetadata, FAQ_PRODUTO, jsonLdProduto, NOTA_PRECO, textosPublicaveis } from "../produto";
import "../produtos.css";

export const dynamic = "force-dynamic";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalogo = carregarCatalogoCompleto();
  const item = catalogo ? acharPorSlug(catalogo.itens, slug) : null;
  const titulo = item ? `${item.nome} | União Farma Nações Unidas` : "Produto | União Farma Nações Unidas";
  const descricao = item ? descricaoMetadata(item.nome, (ehNbcal(item.nome) ? null : descricaoPublica(slugify(item.nome), item.isMIP))?.texto) : "Produto da União Farma Nações Unidas, em Sabará.";
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
  const catalogo = carregarCatalogoCompleto();
  let item = catalogo ? acharPorSlug(catalogo.itens, slug) : null;
  // Busca mais flexível se não achou (slug pode vir de nome de exibição).
  if (!item && catalogo) {
    const normal = slugify(slug);
    item = catalogo.itens.find((i) => slugify(i.nome) === normal || slugify(nomeDeExibicao(i.nome)) === normal) ?? null;
  }
  // Também busca em restritos (receita/controlados) para abrir página do produto.
  if (!item) {
    const restritos = carregarRestritos();
    const todos = [...restritos.receita, ...restritos.controlados, ...restritos.consulte];
    const normal = slugify(slug);
    const achado = todos.find((i) => slugify(i.nome) === normal || slugify(i.nomeExibicao || i.nome) === normal || (i.slug && slugify(i.slug) === normal));
    if (achado) item = { nome: achado.nome, lab: achado.lab, categoria: "Medicamentos", preco: achado.preco ?? 0, isMIP: false };
  }
  if (!item) notFound();

  const nomeExibido = nomeDeExibicao(item.nome);
  const slugItem = slugify(item.nome);
  const pagina = `${SITE_URL}/nacoes-unidas/produtos/${slugItem}`;
  const fotoReal = fotoDoProduto(item.nome); // só a foto aprovada vai para o Google (JSON-LD) e para o código de barras
  const foto = fotoExibida(item.nome, item.categoria);
  const conteudo = conteudoDoNome(item.nome);
  // O arquivo da foto oficial é nomeado pelo código de barras (EAN) do produto.
  const ean = (typeof item.ean === "string" && /^\d{8,14}$/.test(item.ean) ? item.ean : null) ?? fotoReal?.match(/(\d{8,14})\.webp$/)?.[1] ?? null;
  const descricaoIA = ehNbcal(item.nome) ? null : descricaoPublica(slugItem, item.isMIP);
  const textos = textosPublicaveis({ descricao: descricaoIA?.texto });
  const combinaCom = itensCombinaCom(carregarCatalogoNacoes().itens, item);
  // Marca já aparece ao lado do nome e a categoria na trilha do topo: a ficha só traz o que é novo.
  const ficha = [
    conteudo ? { rotulo: "Conteúdo", valor: conteudo } : null,
    ean ? { rotulo: "Código de barras", valor: ean } : null,
  ].filter((linha): linha is { rotulo: string; valor: string } => linha !== null);
  const jsonLd = jsonLdProduto({
    nome: nomeExibido,
    lab: item.lab,
    categoria: item.categoria,
    url: pagina,
    image: fotoReal ? `${SITE_URL}${fotoReal}` : null,
    descricao: descricaoIA?.texto,
  });
  const depCat = acharDepartamento(slugify(item.categoria));
  const categoriaHref = depCat && !depCat.provisorio ? `/departamentos/${depCat.slug}` : "/nacoes-unidas/produtos";
  const categoriaRotulo = depCat && !depCat.provisorio ? depCat.nome : "Produtos";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ShopTopo />
      <div className="unit-page landing-page catalogo-nacoes produto-pagina">
        <nav className="catalogo-caminho section-inner produto-caminho" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <a href={categoriaHref}>{categoriaRotulo}</a>
          <IconSetaDireita size={12} />
          <span>{nomeExibido}</span>
        </nav>

        <div className="produto-topo section-inner">
          <div className={foto ? "produto-foto" : "produto-foto produto-foto--vazia"}>
            {foto ? (
              <img src={foto} alt={nomeExibido} width="300" height="300" />
            ) : (
              <SemFoto className="produto-sem-foto" legenda="Sem foto" />
            )}
          </div>

          <article className="produto-card">
            <h1>{nomeExibido}</h1>
            {textos.descricao ? (
              <p className="produto-descricao" data-descricao-origem={descricaoIA?.origem}>
                {textos.descricao}
              </p>
            ) : null}
            <div className="produto-marca-linha">
              {item.lab.trim() ? (
                <p className="produto-marca">
                  <strong>{item.categoria === "Medicamentos" ? "Laboratório" : "Marca"}:</strong> {item.lab.trim()}
                </p>
              ) : <span />}
              <ProdutoAcoes slug={slugItem} titulo={nomeExibido} />
            </div>
            <hr className="produto-divisor" />
            <p className="produto-preco"><Preco precoFmt={formatBRL(item.preco)} variante="grande" /></p>
            {item.esgotado ? <p className="produto-esgotado" role="status">Indisponível no momento. Fale com a loja pelo WhatsApp para saber quando chega.</p> : null}
            <p className="produto-nota">{NOTA_PRECO}</p>
            {item.esgotado ? null : <ProdutoBarra unitId={nacoes.id} nome={nomeExibido} precoCentavos={Math.round(item.preco * 100)} foto={foto} max={item.restam} slug={slugify(item.nome)} />}
          </article>
        </div>

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

        {ficha.length ? (
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
        ) : null}

        <CombinaCom itens={combinaCom} />

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
    </>
  );
}
