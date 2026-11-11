/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../../ContentSiteChrome";
import PainelBanners from "../../../shop/PainelBanners";
import ShopTopo from "../../../shop/ShopTopo";
import { buildWhatsAppUrl, SITE_URL, UNITS } from "../../../site-config";
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
  const jsonLd = jsonLdProduto({
    nome: nomeExibido,
    lab: item.lab,
    categoria: item.categoria,
    url: pagina,
    image: fotoReal ? `${SITE_URL}${fotoReal}` : null,
    descricao: descricaoIA?.texto,
  });
  // No lugar das avaliações de clientes (a União não tem): atalho para tirar dúvida do produto com a farmacêutica, no WhatsApp da loja.
  const duvidaHref = buildWhatsAppUrl(nacoes, `Oi, União Farma Nações Unidas! Tenho uma dúvida sobre "${nomeExibido}". Pode me ajudar?`, { campaign: "produto_duvida", content: slugItem });
  const depCat = acharDepartamento(slugify(item.categoria));
  const categoriaHref = depCat && !depCat.provisorio ? `/departamentos/${depCat.slug}` : "/nacoes-unidas/produtos";
  const categoriaRotulo = depCat && !depCat.provisorio ? depCat.nome : "Produtos";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ShopTopo />
      <PainelBanners />
      <div className="unit-page landing-page catalogo-nacoes produto-pagina">
        <nav className="catalogo-caminho section-inner produto-caminho" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <a href={categoriaHref}>{categoriaRotulo}</a>
          <IconSetaDireita size={12} />
          <span>{nomeExibido}</span>
        </nav>

        {/* Estrutura da página de produto da Drogasil: galeria, informações e cartão de compra no topo; depois os painéis
            "Descrição do produto" e "Características" lado a lado e o carrossel de sugestões. O que a União não tem fica de fora. */}
        <div className="pdp-topo section-inner">
          <div className={foto ? "pdp-galeria" : "pdp-galeria pdp-galeria--vazia"}>
            {foto ? (
              <img src={foto} alt={nomeExibido} width="420" height="420" />
            ) : (
              <SemFoto className="produto-sem-foto" legenda="Sem foto" />
            )}
          </div>

          <article className="pdp-info">
            <h1>{nomeExibido}</h1>
            <div className="pdp-meta">
              <p>
                {item.lab.trim() ? <span>{item.lab.trim()}</span> : null}
                {item.lab.trim() && conteudo ? <span aria-hidden="true" className="pdp-ponto">•</span> : null}
                {conteudo ? <span>{conteudo}</span> : null}
              </p>
              <ProdutoAcoes slug={slugItem} titulo={nomeExibido} />
            </div>
            <p className="pdp-vendido">Vendido e entregue por <strong>União Farma</strong></p>
            {textos.descricao ? (
              <p className="pdp-resumo" data-descricao-origem={descricaoIA?.origem}>
                {textos.descricao}
              </p>
            ) : null}
            <p className="pdp-links">
              <a href="#descricao">Descrição completa</a>
              <a href="#faq-produto">Perguntas frequentes</a>
              <a href={duvidaHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="produto_duvida">Tirar dúvida no WhatsApp</a>
            </p>
          </article>

          <aside className="pdp-compra" aria-label="Comprar">
            <p className="produto-preco"><Preco precoFmt={formatBRL(item.preco)} variante="grande" /></p>
            {item.esgotado ? <p className="produto-esgotado" role="status">Indisponível no momento. Fale com a loja pelo WhatsApp para saber quando chega.</p> : null}
            <p className="produto-nota">{NOTA_PRECO}</p>
            {item.esgotado ? null : <ProdutoBarra unitId={nacoes.id} nome={nomeExibido} precoCentavos={Math.round(item.preco * 100)} foto={foto} max={item.restam} slug={slugify(item.nome)} />}
            {/* No lugar do cálculo de frete por CEP da Drogasil: como a União entrega e recebe, sem inventar prazo nem taxa. */}
            <ul className="pdp-receber" aria-label="Como receber">
              <li><strong>Retire na loja</strong><span>Nações Unidas, em Sabará</span></li>
              <li><strong>Entrega no bairro</strong><span><a href="/entrega-de-medicamentos-em-sabara">Veja como funciona</a></span></li>
              <li><strong>Pagamento</strong><span>Na retirada ou na entrega</span></li>
            </ul>
          </aside>
        </div>

        <div className="pdp-paineis section-inner">
          <section className="pdp-painel" id="descricao" aria-labelledby="descricao-titulo">
            <h2 id="descricao-titulo">Descrição do produto</h2>
            {textos.descricao || textos.paraQueServe || textos.destaques ? (
              <>
                {textos.descricao ? <p>{textos.descricao}</p> : null}
                {descricaoIA?.fonte ? (
                  <p className="pdp-fonte">
                    Fonte: <a href={descricaoIA.fonte} target="_blank" rel="noreferrer noopener">{new URL(descricaoIA.fonte).hostname.replace(/^www\./, "")}</a>
                  </p>
                ) : null}
                {textos.paraQueServe ? (
                  <>
                    <h3>Para que serve</h3>
                    <p>{textos.paraQueServe}</p>
                  </>
                ) : null}
                {textos.destaques ? (
                  <>
                    <h3>Destaques do rótulo</h3>
                    <p>{textos.destaques}</p>
                  </>
                ) : null}
              </>
            ) : (
              // Sem texto aprovado para este produto: não inventamos descrição; a farmacêutica da loja explica.
              <p>
                Ainda não temos a descrição deste produto aqui. A farmacêutica da loja pode explicar para que serve e como usar:{" "}
                <a href={duvidaHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="produto_descricao">
                  tirar dúvida no WhatsApp
                </a>
                .
              </p>
            )}
          </section>
          <section className="pdp-painel" aria-labelledby="caracteristicas-titulo">
            <h2 id="caracteristicas-titulo">Características</h2>
            <dl className="pdp-carac">
              {item.lab.trim() ? (
                <div>
                  <dt>{item.categoria === "Medicamentos" ? "Laboratório" : "Marca"}</dt>
                  <dd><a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(item.lab.trim())}`}>{item.lab.trim()}</a></dd>
                </div>
              ) : null}
              <div>
                <dt>Categoria</dt>
                <dd><a href={categoriaHref}>{categoriaRotulo}</a></dd>
              </div>
              {conteudo ? (
                <div>
                  <dt>Conteúdo</dt>
                  <dd>{conteudo}</dd>
                </div>
              ) : null}
              {ean ? (
                <div>
                  <dt>Código de barras</dt>
                  <dd>{ean}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

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
