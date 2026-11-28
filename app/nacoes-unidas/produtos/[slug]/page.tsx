/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentSiteFooter } from "../../../ContentSiteChrome";
import PainelBanners from "../../../shop/PainelBanners";
import NotasGoogle from "../../../shop/NotasGoogle";
import RespostasCompra from "../../../shop/RespostasCompra";
import { bannersDoServidor } from "../../../shop/destaques-servidor";
import MarcasTrabalhamos from "../../../shop/MarcasTrabalhamos";
import VoceTambemInteressado, { termosRelacionados } from "../VoceTambemInteressado";
import DestaquesDepartamento, { gruposDoDepartamento } from "../DestaquesDepartamento";
import ShopTopo from "../../../shop/ShopTopo";
import RegistrarVisto from "../../../shop/RegistrarVisto";
import { buildWhatsAppUrl, SITE_URL, UNITS, WHATSAPP_SLA } from "../../../site-config";
import { IconSetaDireita } from "../../../reserva/ReservaIcons";
import Preco from "../Preco";
import SemFoto from "../SemFoto";
import MeiosPagamento from "../MeiosPagamento";
import { acharPorSlug, carregarCatalogoCompleto, carregarCatalogoNacoes, formatBRL, slugify } from "../catalogo";
import { carregarRestritos } from "../receita";
import { acharDepartamento } from "../departamentos";
import { fotoDoProduto } from "../imagens";
import { fotoExibida } from "../foto-exibida";
import { fotosExtrasDoProduto } from "../fotos-extras";
import GaleriaProduto from "../GaleriaProduto";
import ProdutoBarra from "../ProdutoBarra";
import { nomeDeExibicao } from "../../../nome-exibicao";
import CombinaCom, { itensCombinaCom, itensDaMarca, itensDestaque, itensRelacionados } from "../CombinaCom";
import CompletaKit, { itensCompletaKit } from "../CompletaKit";
import { descricaoPublica } from "../descricoes";
import { conteudoDoNome, ehNbcal, descricaoMetadata, FAQ_PRODUTO, jsonLdProduto, NOTA_PRECO, textosPublicaveis } from "../produto";
import { ehMedicamentoOuDuvida, elegivelGoogle, gtinValido } from "../google-shopping";
import { banco } from "../../../estoque-fonte";
import { listarApresentacoes } from "../../../apresentacoes-produto";
import type { ApresentacaoPublica } from "../../../apresentacao-produto-tipos";
import { grupoDoProduto } from "../../../variacoes-produto";
import { codigoDoItem, resolverGrupo, type VariacoesResolvidas } from "../../../variacoes-resolver";
import SeletorVariacoes from "../SeletorVariacoes";
import "../produtos.css";

export const dynamic = "force-dynamic";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const catalogo = carregarCatalogoCompleto();
  const item = catalogo ? acharPorSlug(catalogo.itens, slug) : null;
  const titulo = item ? `${item.nome} | União Farma Nações Unidas` : "Produto | União Farma Nações Unidas";
  // Fonte única (elegivelGoogle): só item não medicamento, em estoque e com foto vai para a busca. Medicamento segue com noindex.
  const noGoogle = item && catalogo ? elegivelGoogle(item, catalogo.itens) : false;
  const descricao = item ? descricaoMetadata(item.nome, (ehNbcal(item.nome) ? null : descricaoPublica(slugify(item.nome), item.isMIP))?.texto, !ehMedicamentoOuDuvida(item)) : "Produto da União Farma Nações Unidas, em Sabará.";
  return {
    title: { absolute: titulo },
    description: descricao,
    alternates: { canonical: item ? `/nacoes-unidas/produtos/${slugify(item.nome)}` : "/nacoes-unidas/produtos" },
    robots: noGoogle ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { title: titulo, description: descricao, url: item ? `${SITE_URL}/nacoes-unidas/produtos/${slugify(item.nome)}` : `${SITE_URL}/nacoes-unidas/produtos`, type: "website" },
  };
}

export default async function ProdutoNacoesPage({ params }: Props) {
  const { slug } = await params;
  const bannersProduto = await bannersDoServidor(); // arte (arquivo leve) já no HTML: sem "pulo" e com carregamento antecipado (LCP)
  const catalogo = carregarCatalogoCompleto();
  let item = catalogo ? acharPorSlug(catalogo.itens, slug) : null;
  // Busca mais flexível se não achou (slug pode vir de nome de exibição).
  if (!item && catalogo) {
    const normal = slugify(slug);
    item = catalogo.itens.find((i) => slugify(i.nome) === normal || slugify(nomeDeExibicao(i.nome)) === normal) ?? null;
  }
  // Também busca em restritos (receita/controlados) para abrir página do produto.
  let controlado = false; // sem preço, cesta nem pedido no site (controle especial ou antimicrobiano)
  let controleEspecial = false;
  if (!item) {
    const restritos = carregarRestritos();
    const todos = [...restritos.receita, ...restritos.controlados, ...restritos.consulte];
    const normal = slugify(slug);
    const achado = todos.find((i) => slugify(i.nome) === normal || slugify(i.nomeExibicao || i.nome) === normal || (i.slug && slugify(i.slug) === normal));
    if (achado) {
      item = { nome: achado.nome, lab: achado.lab, categoria: "Medicamentos", preco: achado.preco ?? 0, isMIP: false };
      controlado = achado.semVenda;
      controleEspecial = achado.portaria344;
    }
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
  const db = banco();
  const codigoAtual = codigoDoItem(item);
  // As duas leituras do banco (opções do mesmo código e variações de tamanho/cor) rodam juntas: a página espera uma vez só.
  const [apresentacoes, variacoes] = await Promise.all([
    ean && db
      ? listarApresentacoes(db as Parameters<typeof listarApresentacoes>[0], ean)
          .then((lista): ApresentacaoPublica[] => lista.map((a) => ({ ...a, ean, foto: a.fotoOrdem ? `/api/apresentacoes-produto?ean=${ean}&ordem=${a.fotoOrdem}&imagem=1` : null })))
          .catch((): ApresentacaoPublica[] => [])
      : Promise.resolve<ApresentacaoPublica[]>([]),
    // Variações (tamanho, cor...) cadastradas no painel: cada ficha leva à página do produto daquele tamanho.
    codigoAtual && db
      ? grupoDoProduto(db as Parameters<typeof grupoDoProduto>[0], codigoAtual)
          .then((grupo): VariacoesResolvidas | null => {
            const resolvido = grupo ? resolverGrupo(grupo) : null;
            return resolvido && resolvido.fichas.length >= 2 && resolvido.fichas.some((f) => f.ean === codigoAtual) ? resolvido : null;
          })
          .catch((): VariacoesResolvidas | null => null)
      : Promise.resolve<VariacoesResolvidas | null>(null),
  ]);
  const descricaoIA = ehNbcal(item.nome) ? null : descricaoPublica(slugItem, item.isMIP);
  const textos = textosPublicaveis({ descricao: descricaoIA?.texto });
  const itensNacoes = carregarCatalogoNacoes().itens;
  const combinaCom = itensCombinaCom(itensNacoes, item);
  const completaKit = itensCompletaKit(itensNacoes, item);
  const relacionados = itensRelacionados(itensNacoes, item, new Set(combinaCom.map((c) => slugify(c.nome))));
  const daMarca = itensDaMarca(itensNacoes, item, new Set([...combinaCom, ...relacionados].map((c) => slugify(c.nome))));
  // Dois carrosséis de destaques por critério objetivo (preço e categoria), sem repetir produtos de outras listas da página.
  const jaMostrados = new Set([...combinaCom, ...relacionados, ...daMarca].map((c) => slugify(c.nome)));
  const ateVinte = itensDestaque(itensNacoes, item, { precoMax: 20 }, jaMostrados);
  const cuidadoPele = itensDestaque(itensNacoes, item, { categorias: ["Dermocosméticos"] }, new Set([...jaMostrados, ...ateVinte.map((c) => slugify(c.nome))]));
  // Mesma regra do feed do Google: o preço do site vale como preço firme e o JSON-LD leva a oferta. Medicamento fica como estava.
  const noCatalogo = Boolean(catalogo && catalogo.itens.includes(item));
  const noGoogle = !controlado && noCatalogo && elegivelGoogle(item, catalogo.itens);
  // Item que não é medicamento: o preço do site vale (preço firme). Medicamento mantém o aviso de confirmar preço e estoque.
  const precoFirme = !controlado && noCatalogo && !ehMedicamentoOuDuvida(item);
  const jsonLd = jsonLdProduto({
    nome: nomeExibido,
    lab: item.lab,
    categoria: item.categoria,
    url: pagina,
    image: fotoReal ? `${SITE_URL}${fotoReal}` : null,
    descricao: descricaoIA?.texto,
    oferta: noGoogle ? { preco: item.preco, gtin: gtinValido(ean) ? ean : null } : null,
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
      {/* Só produto que não é remédio entra no "Visto recentemente" da home. */}
      {precoFirme ? <RegistrarVisto slug={slugItem} /> : null}
      <div className="unit-page landing-page catalogo-nacoes produto-pagina">
        <nav className="catalogo-caminho section-inner produto-caminho" aria-label="Breadcrumb">
          <a href="/">União Farma</a>
          <IconSetaDireita size={12} />
          <a href={categoriaHref}>{categoriaRotulo}</a>
          <IconSetaDireita size={12} />
          <span>{nomeExibido}</span>
        </nav>

        {/* Estrutura da página de produto: nome, foto larga e cartão de compra no topo; depois o bloco de entrega e quantidade,
            os produtos relacionados, os meios de pagamento e as perguntas. O que a União não tem fica de fora. */}
        <div className="pdp-topo section-inner">
          <div className="pdp-cartao">
          <h1 className="pdp-titulo">{nomeExibido}</h1>
          <div className={foto ? "pdp-galeria" : "pdp-galeria pdp-galeria--vazia"}>
            {foto ? (
              <GaleriaProduto fotos={[foto, ...fotosExtrasDoProduto(ean)]} alt={nomeExibido} />
            ) : (
              <SemFoto className="produto-sem-foto" legenda="Sem foto" />
            )}
          </div>

          <aside className="pdp-compra" aria-label="Comprar">
            {variacoes ? <SeletorVariacoes eixo={variacoes.eixo} fichas={variacoes.fichas} atual={codigoAtual} /> : null}
            {controlado ? (
              <>
                <p className="produto-preco"><Preco precoFmt={null} vazio="Consulte o farmacêutico" variante="grande" /></p>
                <p className="produto-nota" role="note">{controleEspecial ? "Medicamento controlado (Portaria SVS/MS 344/98): não é vendido pelo site e não tem preço aqui. A venda é só na loja, com a Notificação de Receita, e a farmácia retém a receita." : "Medicamento de venda sob prescrição com retenção da receita, como os antimicrobianos: não é vendido pelo site e não tem preço aqui. A venda é só na loja, com a receita, e a farmácia retém a via."}</p>
              </>
            ) : (
              <p className="produto-preco"><Preco precoFmt={formatBRL(apresentacoes.length > 1 ? Math.min(...apresentacoes.map((a) => a.precoCentavos)) / 100 : item.preco)} variante="grande" />{apresentacoes.length > 1 ? <small>Preço por unidade. Escolha a apresentação antes de adicionar.</small> : null}</p>
            )}
            {item.esgotado ? (
              <p className="produto-esgotado" role="status">
                Indisponível no momento.{" "}
                <a href={duvidaHref} target="_blank" rel="noopener noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="produto_esgotado">
                  Perguntar quando chega no WhatsApp
                </a>{" "}
                (respondemos {WHATSAPP_SLA}).
              </p>
            ) : null}
            {controlado || precoFirme ? null : <p className="produto-nota">{NOTA_PRECO}</p>}
            {item.esgotado || controlado ? null : (
              <p className="pdp-entrega">
                <strong>Retire grátis na loja ou receba em casa em Sabará</strong>
                <a href="/entrega-de-medicamentos-em-sabara">Ver bairros e taxa de entrega</a>
              </p>
            )}
            {item.esgotado || controlado ? null : <ProdutoBarra bloco unitId={nacoes.id} nome={nomeExibido} precoCentavos={Math.round(item.preco * 100)} foto={foto} max={item.restam} slug={slugify(item.nome)} apresentacoes={apresentacoes} />}
            {item.esgotado || controlado ? null : <RespostasCompra />}
            {item.esgotado || controlado || ehMedicamentoOuDuvida(item) ? null : <NotasGoogle />}
            {item.esgotado || controlado ? null : <CompletaKit itens={completaKit} />}
          </aside>
          </div>
          {item.esgotado || controlado ? null : <ProdutoBarra unitId={nacoes.id} nome={nomeExibido} precoCentavos={Math.round(item.preco * 100)} foto={foto} max={item.restam} slug={slugify(item.nome)} apresentacoes={apresentacoes} />}
        </div>

        <CombinaCom itens={combinaCom} />
        <CombinaCom itens={relacionados} titulo="Produtos relacionados" nota={null} id="relacionados-titulo" />

        <section className="pdp-detalhes section-inner" aria-labelledby="detalhes-titulo">
          <h2 id="detalhes-titulo">Detalhes do produto</h2>
          <div className="pdp-detalhes-card">
            <div className="pdp-detalhes-bloco">
              {textos.paraQueServe || textos.destaques ? (
                <>
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
                // Sem texto aprovado para este produto: não inventamos detalhes; a farmacêutica da loja explica.
                <p>
                  Ainda não temos mais detalhes deste produto aqui. A farmacêutica da loja pode explicar para que serve e como usar:{" "}
                  <a href={duvidaHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="produto_descricao">
                    tirar dúvida no WhatsApp
                  </a>
                  .
                </p>
              )}
            </div>
          </div>
        </section>

        {(() => {
          // "O que você precisa saber": só fatos do cadastro e textos já aprovados. Nada de promessa de efeito inventada.
          const pontos: string[] = [];
          if (conteudo) pontos.push(`Conteúdo: ${conteudo}`);
          if (item.lab.trim()) pontos.push(`${item.categoria === "Medicamentos" ? "Laboratório" : "Marca"}: ${item.lab.trim()}`);
          pontos.push(`Categoria: ${categoriaRotulo}`);
          return pontos.length >= 2 ? (
            <section className="pdp-saber section-inner" aria-labelledby="saber-titulo">
              <h2 id="saber-titulo">O que você precisa saber sobre este produto</h2>
              <ul className="pdp-saber-lista">
                {pontos.map((ponto) => <li key={ponto}>{ponto}</li>)}
              </ul>
            </section>
          ) : null;
        })()}

        <section className="pdp-attrs section-inner" aria-labelledby="atributos-titulo">
          <h2 id="atributos-titulo">Características do produto</h2>
          <dl className="pdp-attrs-lista">
            {item.lab.trim() ? (
              <div>
                <span className="pdp-attrs-icone" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12.6 12.6 20a2 2 0 0 1-2.8 0L3 13.2V4h9.2L20 11.8a1 1 0 0 1 0 .8Z" /><circle cx="8" cy="8" r="1.3" /></svg>
                </span>
                <dt>{item.categoria === "Medicamentos" ? "Laboratório" : "Marca"}</dt>
                <dd><a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(item.lab.trim())}`}>{item.lab.trim()}</a></dd>
              </div>
            ) : null}
            <div>
              <span className="pdp-attrs-icone" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
              </span>
              <dt>Categoria</dt>
              <dd><a href={categoriaHref}>{categoriaRotulo}</a></dd>
            </div>
            {conteudo ? (
              <div>
                <span className="pdp-attrs-icone" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" /><path d="M7.5 15h9" /></svg>
                </span>
                <dt>Conteúdo</dt>
                <dd>{conteudo}</dd>
              </div>
            ) : null}
            {ean ? (
              <div>
                <span className="pdp-attrs-icone" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5v14M8 5v14M12 5v14M16 5v9M20 5v14M16 18v1" /></svg>
                </span>
                <dt>Código de barras</dt>
                <dd>{ean}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {textos.descricao ? (
          <section className="pdp-descricao section-inner" id="descricao" aria-labelledby="descricao-titulo">
            <h2 id="descricao-titulo">Descrição</h2>
            <div className="pdp-descricao-card">
              <p data-descricao-origem={descricaoIA?.origem}>{textos.descricao}</p>
              {descricaoIA?.fonte ? (
                <p className="pdp-fonte">
                  Fonte: <a href={descricaoIA.fonte} target="_blank" rel="noreferrer noopener">{new URL(descricaoIA.fonte).hostname.replace(/^www\./, "")}</a>
                </p>
              ) : null}
        {/* Sem "quem viu também comprou": a loja não tem histórico de compras. O critério aqui é só a mesma marca. */}
        <CombinaCom itens={daMarca} titulo={`Mais da marca ${item.lab.trim()}`} nota={null} id="marca-titulo" />
            </div>
          </section>
        ) : null}

        {controlado ? null : <MeiosPagamento />}
        <div className="pdp-banners"><PainelBanners inicial={bannersProduto} /></div>

        <section className="pdp-perguntas section-inner" aria-labelledby="perguntas-titulo">
          <h2 id="perguntas-titulo">Perguntas</h2>
          <p className="pdp-perguntas-nota">Fale direto com a equipe farmacêutica da loja pelo WhatsApp — respondemos {WHATSAPP_SLA}.</p>
          <a className="pdp-perguntar" href={duvidaHref} target="_blank" rel="noopener noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="produto_perguntar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6L10 3zM18 13l.9 2.1L21 16l-2.1.9L18 19l-.9-2.1L15 16l2.1-.9L18 13zM18 3l.7 1.8L20.5 5.5l-1.8.7L18 8l-.7-1.8L15.5 5.5l1.8-.7L18 3z" /></svg>
            <span className="pdp-perguntar-rotulo">Tirar dúvida com a farmacêutica</span>
          </a>
          <details className="pdp-perguntas-todas" id="faq-produto">
            <summary>
              <span>Ver todas as perguntas</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </summary>
            <div className="pdp-faq-lista">
              <h3>Perguntas frequentes</h3>
              {FAQ_PRODUTO.map((faq) => (
                <div key={faq.q}>
                  <strong>{faq.q}</strong>
                  <p>{faq.a}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
        <MarcasTrabalhamos />
        <CombinaCom itens={ateVinte} titulo="Achados até R$ 20" nota={null} id="achados-titulo" />
        <CombinaCom itens={cuidadoPele} titulo="Cuidado com a pele" nota={null} id="pele-titulo" />
        <VoceTambemInteressado termos={termosRelacionados(itensNacoes, item, categoriaRotulo)} />
        <DestaquesDepartamento grupos={gruposDoDepartamento(itensNacoes, item.categoria)} departamento={item.categoria} />


        
      </div>
      <ContentSiteFooter />
    </>
  );
}
