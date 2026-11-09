"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import { quantidadeLegivel } from "./quantidade";
import { useEffect, useState } from "react";
import { ContentSiteFooter } from "../../ContentSiteChrome";
import ReservarBotao from "../../reserva/ReservarBotao";
import CartaoPanvel from "./CartaoPanvel";
import { termosDeBusca } from "./busca";
import Paginacao, { hrefPagina, irParaPagina, paginaDaUrl, POR_PAGINA } from "./Paginacao";
import ShopTopo from "../../shop/ShopTopo";
import BotaoVoz from "../../shop/BotaoVoz";
import { buildWhatsAppUrl, getHoursSentence, UNITS } from "../../site-config";
import { formatBRL, slugify } from "./catalogo";
import {
  imagemIlustrativa,
  type ItemRestrito,
  type TipoRestrito,
} from "./receita";
import "./produtos.css";

const nacoes = UNITS.find((unit) => unit.id === "nacoes")!;

export type ParamsLista = { q?: string | string[]; pagina?: string | string[] };

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
      "Lista de preços informativa de medicamentos de venda sob prescrição médica. Retire na loja apresentando a receita.",
    rota: "/nacoes-unidas/produtos/receita",
    vazio: "Nenhum medicamento encontrado nesta lista.",
    caminho: "Com receita",
  },
  controlados: {
    titulo: "Medicamentos controlados: lista de preços | União Farma Nações Unidas",
    h1: "Medicamentos controlados: lista de preços",
    intro:
      "Lista de preços informativa de medicamentos controlados (Portaria SVS/MS 344/98). Retire na loja; a receita fica retida pela farmácia.",
    rota: "/nacoes-unidas/produtos/controlados",
    vazio: "Nenhum medicamento controlado encontrado nesta lista.",
    caminho: "Controlados",
  },
  consulte: {
    titulo: "Consulte o farmacêutico: lista de preços | União Farma Nações Unidas",
    h1: "Consulte o farmacêutico: lista de preços",
    intro:
      "Itens com enquadramento (com ou sem receita) em confirmação. Preços informativos, sem cesta: antes de comprar, converse com o farmacêutico.",
    rota: "/nacoes-unidas/produtos/consulte-o-farmaceutico",
    vazio: "Nenhum item encontrado nesta lista.",
    caminho: "Consulte o farmacêutico",
  },
};


export function Cartao({ item }: { item: ItemRestrito }) {
  const nome = item.nomeExibicao ?? item.nome;
  const pedeCesta = item.tipo !== "consulte" && item.preco !== null && item.preco > 0;
  return (
    <CartaoPanvel
      tipo={item.tipo}
      href={`/nacoes-unidas/produtos/${slugify(item.nome)}`}
      classe={`restrito-item${item.controlado ? " restrito-controlado" : ""}`}
      nome={nome}
      marca={item.lab}
      apresentacao={quantidadeLegivel(item.apresentacao)}
      foto={imagemIlustrativa(item)}
      precoFmt={item.preco !== null ? formatBRL(item.preco) : null}
      restam={item.restam}
      cesta={
        pedeCesta ? (
          <ReservarBotao
            unitId={nacoes.id}
            nome={nome}
            precoCentavos={Math.round((item.preco as number) * 100)}
            foto={imagemIlustrativa(item)}
            source={`produtos_nacoes_${item.tipo}`}
            receita={item.controlado ? "controlado" : "receita"}
            variante="cesta"
            max={item.restam}
            compacto
          />
        ) : null
      }
    />
  );
}

export default function ListaRestrita({ tipo }: { tipo: TipoRestrito }) {
  const t = TEXTOS[tipo];
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [todos, setTodos] = useState<ItemRestrito[]>([]);
  const [data, setData] = useState<string | null>(null);
  useEffect(() => {
    const lerUrl = () => {
      const params = new URLSearchParams(window.location.search);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- página estática: o termo e a página só existem na barra de endereço
      setConsulta((params.get("q") || "").slice(0, 80));
      setPagina(paginaDaUrl(window.location.search));
    };
    lerUrl();
    window.addEventListener("popstate", lerUrl);
    let cancelado = false;
    (async () => {
      try {
        const idx = await fetch("/dados/nacoes/restritos-index.json").then((r) => r.json());
        if (cancelado) return;
        setData(idx.geradoEm ? new Date(idx.geradoEm).toLocaleDateString("pt-BR") : null);
        const paginas: number = idx[tipo]?.paginas ?? 0;
        // Carrega todas as fatias da lista: a busca e a paginação de 24 em 24 trabalham sobre a lista inteira.
        const fatias = await Promise.all(Array.from({ length: paginas }, (_, k) => fetch(`/dados/nacoes/restritos/${tipo}/p${k + 1}.json`).then((r) => (r.ok ? r.json() : []))));
        if (!cancelado) setTodos((fatias as ItemRestrito[][]).flat());
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelado = true;
      window.removeEventListener("popstate", lerUrl);
    };
  }, [tipo]);
  const termos = termosDeBusca(consulta);
  const filtrados = termos.length === 0 ? todos : todos.filter((i) => termos.every((t) => (i.busca ?? "").includes(t)));
  const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, paginas);
  const pag = { itens: filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA), pagina: paginaAtual, paginas };
  const wa = buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Vi a lista de preços no site e quero confirmar preço e disponibilidade.", {
    campaign: "produtos_nacoes",
    content: `nacoes_${tipo}`,
  });

  return (
    <>
      <ShopTopo />
      <div className="unit-page landing-page catalogo-nacoes catalogo-loja restrito-pagina">
        <nav className="catalogo-caminho section-inner" aria-label="Breadcrumb">
          <a href="/">União Farma</a> / <a href="/nacoes-unidas/produtos">Produtos</a> / <span>{t.caminho}</span>
        </nav>
        <h1 className="catalogo-titulo section-inner">{t.h1}</h1>
        <div className="section-inner" id="lista">
          <div className="catalogo-aviso" role="note">
            <p>{t.intro}</p>
            <p>
              Preços de {data ?? "data não informada"}. Confirme preço e estoque pelo{" "}
              <a href={wa} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={nacoes.id} data-track-source={`produtos_nacoes_${tipo}`}>
                WhatsApp {nacoes.whatsapp}
              </a>
              . {getHoursSentence(nacoes)}
            </p>
            <p>Medicamentos podem causar efeitos indesejados. Leia a bula e, em caso de dúvida, procure o farmacêutico. Não use sem orientação médica.</p>
          </div>
          <form method="get" action={t.rota} className="catalogo-busca" role="search">
            <label htmlFor="restrito-q">Buscar nesta lista</label>
            <div className="voz-campo">
              <input key={consulta} id="restrito-q" name="q" type="search" defaultValue={consulta} maxLength={80} placeholder="Nome ou princípio ativo" />
              <BotaoVoz contexto={tipo} onTexto={(texto) => { window.location.assign(`${t.rota}?q=${encodeURIComponent(texto)}`); }} />
            </div>
            <button type="submit">Buscar</button>
          </form>
          <p className="catalogo-contagem" aria-live="polite">
            {filtrados.length} {filtrados.length === 1 ? "item" : "itens"}
            {consulta ? ` para “${consulta}”` : ""}.
          </p>
          <nav className="catalogo-contagem-links" aria-label="Outras listas">
            {(Object.keys(LINKS) as TipoRestrito[])
              .filter((k) => k !== tipo)
              .map((k) => (
                <a key={k} href={LINKS[k].href}>{LINKS[k].rotulo}</a>
              ))}
            <a href="/nacoes-unidas/produtos">Voltar aos produtos sem receita</a>
          </nav>
          {pag.itens.length === 0 ? (
            <p className="catalogo-vazio">{t.vazio}</p>
          ) : (
            <ul className="catalogo-lista pv-grade">
              {pag.itens.map((item) => (
                <Cartao key={`${item.nome}|${item.lab}|${item.preco}`} item={item} />
              ))}
            </ul>
          )}
          <Paginacao atual={pag.pagina} total={pag.paginas} href={(n) => hrefPagina(n, consulta)} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />
        </div>
      </div>
      <ContentSiteFooter />
    </>
  );
}
