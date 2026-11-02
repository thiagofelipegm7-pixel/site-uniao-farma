/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import { ContentSiteFooter } from "../../ContentSiteChrome";
import ShopTopo from "../../shop/ShopTopo";
import { buildWhatsAppUrl, getHoursSentence, UNITS } from "../../site-config";
import { formatBRL, formatDataDosDados } from "./catalogo";
import {
  carregarRestritos,
  filtrarRestritos,
  IMAGEM_GENERICA,
  NOTA_IMAGEM,
  paginar,
  SELO_CONTROLADO,
  type ItemRestrito,
  type TipoRestrito,
} from "./receita";
import "./produtos.css";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

export type ParamsLista = { q?: string | string[]; pagina?: string | string[] };
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const TEXTOS: Record<TipoRestrito, { titulo: string; h1: string; intro: string; rota: string; vazio: string; outra: { href: string; rotulo: string } }> = {
  receita: {
    titulo: "Medicamentos com receita: lista de preços | União Farma Nações Unidas",
    h1: "Medicamentos com receita: lista de preços",
    intro:
      "Lista de preços informativa dos medicamentos de venda sob prescrição médica da loja Nações Unidas. Não há venda online nem cesta: a compra é feita no balcão, com a receita.",
    rota: "/nacoes-unidas/produtos/receita",
    vazio: "Nenhum medicamento encontrado nesta lista.",
    outra: { href: "/nacoes-unidas/produtos/controlados", rotulo: "Ver medicamentos controlados" },
  },
  controlados: {
    titulo: "Medicamentos controlados: lista de preços | União Farma Nações Unidas",
    h1: "Medicamentos controlados: lista de preços",
    intro:
      "Lista de preços informativa dos medicamentos controlados (Portaria SVS/MS 344/98) da loja Nações Unidas. Não há venda online nem cesta: a compra é feita no balcão, com a receita retida pela farmácia.",
    rota: "/nacoes-unidas/produtos/controlados",
    vazio: "Nenhum medicamento controlado encontrado nesta lista.",
    outra: { href: "/nacoes-unidas/produtos/receita", rotulo: "Ver medicamentos com receita" },
  },
};

export function metadadosRestrita(tipo: TipoRestrito) {
  const t = TEXTOS[tipo];
  return {
    title: { absolute: t.titulo },
    description: t.intro,
    alternates: { canonical: t.rota },
    robots: { index: false, follow: false },
  };
}

function Cartao({ item }: { item: ItemRestrito }) {
  const ficha: Array<[string, string]> = [];
  if (item.ativo) ficha.push(["Princípio ativo", item.ativo]);
  if (item.lab.trim()) ficha.push(["Fabricante", item.lab.trim()]);
  if (item.concentracao) ficha.push(["Concentração", item.concentracao]);
  if (item.apresentacao) ficha.push(["Apresentação", item.apresentacao]);
  if (item.rms) ficha.push(["RMS", item.rms]);
  return (
    <li className={`catalogo-item restrito-item${item.controlado ? " restrito-controlado" : ""}`} data-tipo={item.tipo}>
      <img className="catalogo-foto" src={IMAGEM_GENERICA} alt="Imagem meramente ilustrativa de embalagem de medicamento" width={80} height={80} loading="lazy" decoding="async" />
      <div className="catalogo-info">
        {item.controlado ? <p className="restrito-selo">{SELO_CONTROLADO}</p> : null}
        <h4>{item.nome}</h4>
        {ficha.length > 0 ? (
          <dl className="restrito-ficha">
            {ficha.map(([rotulo, valor]) => (
              <div key={rotulo}>
                <dt>{rotulo}</dt>
                <dd>{valor}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <p className="restrito-aviso">{item.aviso}</p>
        <p className="restrito-ilustrativa">{NOTA_IMAGEM}</p>
      </div>
      <p className="catalogo-preco">{item.preco !== null ? formatBRL(item.preco) : "Consultar"}</p>
    </li>
  );
}

export default function ListaRestrita({ tipo, params }: { tipo: TipoRestrito; params: ParamsLista }) {
  const t = TEXTOS[tipo];
  const consulta = primeiro(params.q).slice(0, 80);
  const dados = carregarRestritos();
  const todos = tipo === "receita" ? dados.receita : dados.controlados;
  const filtrados = filtrarRestritos(todos, consulta);
  const pag = paginar(filtrados, Number(primeiro(params.pagina)));
  const data = formatDataDosDados(dados.geradoEm);
  const wa = buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Vi a lista de preços no site e quero confirmar preço e disponibilidade.", {
    campaign: "produtos_nacoes",
    content: `nacoes_${tipo}`,
  });
  const link = (p: number) => `${t.rota}?${new URLSearchParams({ ...(consulta ? { q: consulta } : {}), ...(p > 1 ? { pagina: String(p) } : {}) }).toString()}`.replace(/\?$/, "");

  return (
    <>
      <ShopTopo />
      <div className="unit-page landing-page catalogo-nacoes catalogo-loja restrito-pagina">
        <nav className="catalogo-caminho section-inner" aria-label="Breadcrumb">
          <a href="/">União Farma</a> / <a href="/nacoes-unidas/produtos">Produtos</a> / <span>{tipo === "receita" ? "Com receita" : "Controlados"}</span>
        </nav>
        <h1 className="catalogo-titulo section-inner">{t.h1}</h1>
        <div className="section-inner">
          <div className="catalogo-aviso" role="note">
            <p>{t.intro}</p>
            <p>
              Preços do sistema da loja Nações Unidas, com dados de {data ?? "data não informada"}. Preço e disponibilidade podem ter mudado: confirme com a loja pelo{" "}
              <a href={wa} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={nacoes.id} data-track-source={`produtos_nacoes_${tipo}`}>
                WhatsApp {nacoes.whatsapp}
              </a>
              . {getHoursSentence(nacoes)}
            </p>
            <p>Medicamentos podem causar efeitos indesejados. Leia a bula e, em caso de dúvida, procure o farmacêutico. Não use sem orientação médica.</p>
          </div>
          <form method="get" action={t.rota} className="catalogo-busca" role="search">
            <label htmlFor="restrito-q">Buscar nesta lista</label>
            <input id="restrito-q" name="q" type="search" defaultValue={consulta} maxLength={80} placeholder="Nome ou princípio ativo" />
            <button type="submit">Buscar</button>
          </form>
          <p className="catalogo-contagem" aria-live="polite">
            {filtrados.length} {filtrados.length === 1 ? "item" : "itens"}
            {consulta ? ` para “${consulta}”` : ""}. <a href={t.outra.href}>{t.outra.rotulo}</a> · <a href="/nacoes-unidas/produtos">Voltar aos produtos sem receita</a>
          </p>
          {pag.itens.length === 0 ? (
            <p className="catalogo-vazio">{t.vazio}</p>
          ) : (
            <ul className="catalogo-lista">
              {pag.itens.map((item) => (
                <Cartao key={`${item.nome}|${item.lab}|${item.preco}`} item={item} />
              ))}
            </ul>
          )}
          {pag.paginas > 1 ? (
            <nav className="restrito-paginas" aria-label="Páginas">
              {pag.pagina > 1 ? <a href={link(pag.pagina - 1)}>← Anterior</a> : <span />}
              <span>
                Página {pag.pagina} de {pag.paginas}
              </span>
              {pag.pagina < pag.paginas ? <a href={link(pag.pagina + 1)}>Próxima →</a> : <span />}
            </nav>
          ) : null}
        </div>
      </div>
      <ContentSiteFooter />
    </>
  );
}
