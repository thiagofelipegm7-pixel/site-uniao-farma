"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import { useEffect, useState } from "react";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import ShopTopo from "../../shop/ShopTopo";
import { buildWhatsAppUrl, getHoursSentence, UNITS } from "../../site-config";
import { formatBRL, formatDataDosDados } from "./catalogo";
import {
  COMO_COMPRAR,
  COMO_COMPRAR_CONSULTE,
  imagemIlustrativa,
  NOTA_IMAGEM,
  ROTULO_TARJA,
  SELO_CONTROLADO,
  type ItemRestrito,
  type TipoRestrito,
} from "./receita";
import "./produtos.css";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

export type ParamsLista = { q?: string | string[]; pagina?: string | string[] };
const primeiro = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

type Link = { href: string; rotulo: string };
const LINKS: Record<TipoRestrito, Link> = {
  receita: { href: "/nacoes-unidas/produtos/receita", rotulo: "Ver medicamentos com receita" },
  controlados: { href: "/nacoes-unidas/produtos/controlados", rotulo: "Ver medicamentos controlados" },
  consulte: { href: "/nacoes-unidas/produtos/consulte-o-farmaceutico", rotulo: "Ver itens para consultar o farmacêutico" },
};

const TEXTOS: Record<TipoRestrito, { titulo: string; h1: string; intro: string; rota: string; vazio: string; caminho: string }> = {
  receita: {
    titulo: "Medicamentos com receita: lista de preços | União Farma Nações Unidas",
    h1: "Medicamentos com receita: lista de preços",
    intro:
      "Lista de preços informativa dos medicamentos de venda sob prescrição médica da loja Nações Unidas. Não há venda online nem cesta: a compra é feita na loja ou combinada pelo WhatsApp, sempre com a receita.",
    rota: "/nacoes-unidas/produtos/receita",
    vazio: "Nenhum medicamento encontrado nesta lista.",
    caminho: "Com receita",
  },
  controlados: {
    titulo: "Medicamentos controlados: lista de preços | União Farma Nações Unidas",
    h1: "Medicamentos controlados: lista de preços",
    intro:
      "Lista de preços informativa dos medicamentos controlados (Portaria SVS/MS 344/98) da loja Nações Unidas. Não há venda online nem cesta: a compra é feita na loja ou combinada pelo WhatsApp, com a receita retida pela farmácia.",
    rota: "/nacoes-unidas/produtos/controlados",
    vazio: "Nenhum medicamento controlado encontrado nesta lista.",
    caminho: "Controlados",
  },
  consulte: {
    titulo: "Consulte o farmacêutico: lista de preços | União Farma Nações Unidas",
    h1: "Consulte o farmacêutico: lista de preços",
    intro:
      "Itens da loja Nações Unidas cujo enquadramento (com ou sem receita) ainda está sendo confirmado. Os preços são informativos. Não há venda online nem cesta: antes de comprar, converse com o farmacêutico na loja ou pelo WhatsApp.",
    rota: "/nacoes-unidas/produtos/consulte-o-farmaceutico",
    vazio: "Nenhum item encontrado nesta lista.",
    caminho: "Consulte o farmacêutico",
  },
};


const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Cartao({ item }: { item: ItemRestrito }) {
  const ficha: Array<[string, string]> = [];
  if (item.ativo) ficha.push(["Princípio ativo", maiuscula(item.ativo)]);
  if (item.lab.trim()) ficha.push(["Fabricante", item.lab.trim()]);
  if (item.concentracao) ficha.push(["Concentração", item.concentracao]);
  if (item.apresentacao) ficha.push(["Apresentação", item.apresentacao]);
  if (item.rms) ficha.push(["Registro MS (RMS)", item.rms]);
  if (item.tarja) ficha.push(["Tarja", ROTULO_TARJA[item.tarja]]);
  if (item.tipo !== "consulte") ficha.push(["Retenção da receita", item.retencao === true ? "Sim" : item.retencao === false ? "Não" : "Confirmar com o farmacêutico"]);
  return (
    <li className={`catalogo-item restrito-item${item.controlado ? " restrito-controlado" : ""}`} data-tipo={item.tipo}>
      <img className="catalogo-foto" src={imagemIlustrativa(item)} alt="Imagem meramente ilustrativa de embalagem de medicamento" width={80} height={80} loading="lazy" decoding="async" />
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
        <p className="restrito-compra">
          {item.tipo === "consulte" ? COMO_COMPRAR_CONSULTE : COMO_COMPRAR}{" "}
          <a
            href={buildWhatsAppUrl(nacoes, `Oi, União Farma Nações Unidas! Quero consultar: ${item.nome}.`, { campaign: "produtos_nacoes", content: `nacoes_${item.tipo}_item` })}
            target="_blank"
            rel="noreferrer"
            data-track-event="whatsapp_click"
            data-track-unit={nacoes.id}
            data-track-source={`produtos_nacoes_${item.tipo}_item`}
          >
            Perguntar pelo WhatsApp
          </a>
        </p>
        <p className="restrito-ilustrativa">{NOTA_IMAGEM}</p>
      </div>
      <p className="catalogo-preco">{item.preco !== null ? formatBRL(item.preco) : "Consultar"}</p>
    </li>
  );
}

export default function ListaRestrita({ tipo }: { tipo: TipoRestrito }) {
  const t = TEXTOS[tipo];
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<ItemRestrito[]>([]);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") || "").slice(0, 80);
    const pg = Math.max(1, Number(params.get("pagina")) || 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsulta(q);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPagina(pg);
    (async () => {
      try {
        const idx = await fetch("/dados/nacoes/restritos-index.json").then(r => r.json());
        setData(idx.geradoEm ? new Date(idx.geradoEm).toLocaleDateString("pt-BR") : null);
        const info = idx[tipo];
        setTotal(info?.total || 0);
        // For simplicity load the requested page (search is client filter on loaded, or load all for small lists)
        const pfile = await fetch(`/dados/nacoes/restritos/${tipo}/p${pg}.json`).then(r => r.ok ? r.json() : []);
        let lista = pfile as ItemRestrito[];
        if (q) {
          // load more pages for search if needed; for now filter the page
          const nq = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
          lista = lista.filter(i => (i.busca || "").includes(nq));
        }
        setItens(lista);
      } catch (e) { console.error(e); }
    })();
  }, [tipo]);
  const filtrados = itens;
  const pag = { itens: filtrados, pagina, paginas: Math.ceil(total / 48) || 1 };
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
          <a href="/">União Farma</a> / <a href="/nacoes-unidas/produtos">Produtos</a> / <span>{t.caminho}</span>
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
            {consulta ? ` para “${consulta}”` : ""}. {(Object.keys(LINKS) as TipoRestrito[])
              .filter((k) => k !== tipo)
              .map((k) => (
                <span key={k}>
                  <a href={LINKS[k].href}>{LINKS[k].rotulo}</a> ·{" "}
                </span>
              ))}
            <a href="/nacoes-unidas/produtos">Voltar aos produtos sem receita</a>
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
