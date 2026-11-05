"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "../../analytics";
import { nomeDeExibicao } from "../../nome-exibicao";
import { IconFechar, IconFiltro } from "../../reserva/ReservaIcons";
import ReservarBotao from "../../reserva/ReservarBotao";
import { precoParaCentavos } from "../../reserva/reserva-store";
import {
  aplicarCatalogo,
  contarFiltrosAtivos,
  contarItens,
  eventoBusca,
  eventoFiltro,
  FAIXAS_PRECO,
  identificarItens,
  opcoesFiltro,
  ORDENS_CATALOGO,
  type FaixaPreco,
  type FiltroCatalogo,
  type GrupoBusca,
  type OrdemCatalogo,
} from "./busca";
import { slugify } from "./catalogo";
import { AVISO_NBCAL, ehNbcal } from "./produto";

type Props = {
  /** Texto vindo do campo de busca do cabeçalho (?q=). */
  consultaInicial?: string;
  grupos: GrupoBusca[];
  /** Slug de um departamento (ex.: "beleza"): a página mostra só essa categoria. Sem ele, mostra todas. */
  departamento?: string;
  whatsappHref: string;
  unitId: string;
};

type Selecao = Pick<FiltroCatalogo, "categorias" | "marcas" | "faixas">;

const SELECAO_VAZIA: Selecao = { categorias: [], marcas: [], faixas: [] };
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function alternar<T extends string>(lista: readonly T[] | undefined, valor: T): T[] {
  const atual = lista ?? [];
  return atual.includes(valor) ? atual.filter((item) => item !== valor) : [...atual, valor];
}

/**
 * Ordenação, filtro e grade de produtos. A busca fica no cabeçalho (?q=), como no protótipo.
 * O HTML do servidor já traz a lista inteira, então sem JavaScript ela continua completa.
 */
export default function CatalogoLista({ grupos: gruposProps, departamento, whatsappHref, unitId, consultaInicial = "" }: Props) {
  const [grupos, setGrupos] = useState(gruposProps);
  useEffect(() => {
    if (gruposProps.length > 0) return;
    let cancel = false;
    (async () => {
      try {
        const idx = await fetch("/dados/nacoes/catalogo-index.json").then(r => r.json());
        type ItemPagina = { nomeExibicao?: string; nome: string; lab: string; isMIP: boolean; precoFmt: string; preco: number; foto: string | null };
        const paraItem = (item: ItemPagina) => ({
          nome: item.nomeExibicao || item.nome,
          lab: item.lab,
          isMIP: item.isMIP,
          precoFmt: item.precoFmt,
          preco: item.preco,
          foto: item.foto,
        });
        const lerPagina = (slug: string, n: number): Promise<ItemPagina[]> => fetch(`/dados/nacoes/catalogo/${slug}/p${n}.json`).then((r) => r.json());
        const lista: { slug: string; categoria: string; paginas?: number }[] = (idx.grupos || []).filter((g: { slug: string }) => !departamento || g.slug === departamento);
        const gruposCarregados: GrupoBusca[] = [];
        // Primeiro a página 1 de cada categoria (aparece rápido); depois as demais, até o catálogo inteiro estar na tela.
        for (const g of lista) {
          const p1 = await lerPagina(g.slug, 1);
          gruposCarregados.push({ categoria: g.categoria, id: g.slug, itens: p1.map(paraItem) });
        }
        if (cancel) return;
        setGrupos([...gruposCarregados]);
        for (let k = 0; k < gruposCarregados.length; k += 1) {
          const g = lista[k];
          for (let n = 2; n <= (g?.paginas ?? 1); n += 1) {
            const pagina = await lerPagina(g.slug, n);
            if (cancel) return;
            gruposCarregados[k] = { ...gruposCarregados[k], itens: [...gruposCarregados[k].itens, ...pagina.map(paraItem)] };
          }
          setGrupos([...gruposCarregados]);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancel = true; };
  }, [gruposProps, departamento]);
  const base = identificarItens(grupos);
  const opcoes = opcoesFiltro(base);
  // A página é estática: o termo vem da barra de endereço (?q=fralda) depois que a página abre.
  const [consulta, setConsulta] = useState(consultaInicial);
  useEffect(() => {
    const ler = () => setConsulta((new URLSearchParams(window.location.search).get("q") ?? "").slice(0, 80));
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);
  const [ordem, setOrdem] = useState<OrdemCatalogo>("recomendados");
  const [selecao, setSelecao] = useState<Selecao>(SELECAO_VAZIA);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const filtroRef = useRef<HTMLDivElement>(null);
  const fecharFiltroRef = useRef<HTMLButtonElement>(null);
  const gatilhoFiltroRef = useRef<HTMLButtonElement>(null);
  const filtroEnviado = useRef("");

  const visiveis = aplicarCatalogo(base, { consulta, ordem, ...selecao });
  const total = contarItens(visiveis);
  const ativos = contarFiltrosAtivos(selecao);
  const buscando = consulta.trim().length > 0;

  // Mede a busca uma vez (sem o texto digitado, ver eventoBusca).
  useEffect(() => {
    const evento = eventoBusca(consulta, total);
    if (evento) trackEvent(evento.event, evento.params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta]);

  useEffect(() => {
    if (!filtroAberto) return;
    const gatilho = gatilhoFiltroRef.current;
    const fundo = [
      document.querySelector("header"),
      document.getElementById("conteudo"),
      document.querySelector("main"),
      document.querySelector("footer"),
      document.querySelector(".uf-footer"),
      document.querySelector(".mobile-quick-nav"),
      document.querySelector(".whatsapp-fab"),
      document.querySelector(".skip-link"),
    ].filter((node): node is HTMLElement => node instanceof HTMLElement);
    fundo.forEach((node) => node.setAttribute("inert", ""));
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => fecharFiltroRef.current?.focus(), 20);
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setFiltroAberto(false);
        return;
      }
      if (event.key !== "Tab" || !filtroRef.current) return;
      const focaveis = Array.from(filtroRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)).filter((el) => el.tabIndex !== -1);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (event.shiftKey && document.activeElement === primeiro) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = anterior;
      fundo.forEach((node) => node.removeAttribute("inert"));
      gatilho?.focus();
    };
  }, [filtroAberto]);

  useEffect(() => {
    if (filtroAberto) return;
    const evento = eventoFiltro(selecao, total);
    if (!evento) {
      filtroEnviado.current = "";
      return;
    }
    const assinatura = JSON.stringify({
      categories: selecao.categorias ?? [],
      brands: selecao.marcas ?? [],
      ranges: selecao.faixas ?? [],
    });
    if (filtroEnviado.current === assinatura) return;
    filtroEnviado.current = assinatura;
    trackEvent(evento.event, evento.params);
  }, [filtroAberto, selecao, total]);

  const dialog = (
    <div className="catalogo-filtro-raiz" role="dialog" aria-modal="true" aria-labelledby="catalogo-filtro-titulo" ref={filtroRef}>
      <div className="catalogo-filtro-topo">
        <h2 id="catalogo-filtro-titulo">Filtrar</h2>
        <button ref={fecharFiltroRef} type="button" className="catalogo-filtro-fechar" aria-label="Fechar filtros" onClick={() => setFiltroAberto(false)}>
          <IconFechar size={24} />
        </button>
      </div>
      <div className="catalogo-filtro-corpo">
        <fieldset>
          <legend>Categoria</legend>
          {opcoes.categorias.map((categoria) => (
            <label key={categoria} className="catalogo-filtro-opcao">
              <input
                type="checkbox"
                checked={selecao.categorias?.includes(categoria) ?? false}
                onChange={() => setSelecao((atual) => ({ ...atual, categorias: alternar(atual.categorias, categoria) }))}
              />
              <span>{categoria}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Marca</legend>
          {opcoes.marcas.map((marca) => (
            <label key={marca} className="catalogo-filtro-opcao">
              <input
                type="checkbox"
                checked={selecao.marcas?.includes(marca) ?? false}
                onChange={() => setSelecao((atual) => ({ ...atual, marcas: alternar(atual.marcas, marca) }))}
              />
              <span>{marca}</span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Faixa de preço</legend>
          {FAIXAS_PRECO.map((faixa) => (
            <label key={faixa.id} className="catalogo-filtro-opcao">
              <input
                type="checkbox"
                checked={selecao.faixas?.includes(faixa.id) ?? false}
                onChange={() => setSelecao((atual) => ({ ...atual, faixas: alternar(atual.faixas, faixa.id as FaixaPreco) }))}
              />
              <span>{faixa.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="catalogo-filtro-rodape">
        <button type="button" className="catalogo-filtro-limpar" onClick={() => setSelecao(SELECAO_VAZIA)}>
          Limpar
        </button>
        <button type="button" className="catalogo-filtro-ver" onClick={() => setFiltroAberto(false)}>
          Ver {total} {total === 1 ? "produto" : "produtos"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="catalogo-barra" role="toolbar" aria-label="Filtrar e ordenar">
        <button
          ref={gatilhoFiltroRef}
          type="button"
          className="catalogo-filtrar"
          aria-haspopup="dialog"
          aria-expanded={filtroAberto}
          aria-label={ativos > 0 ? `Filtrar, ${ativos} ${ativos === 1 ? "filtro ativo" : "filtros ativos"}` : "Filtrar"}
          onClick={() => setFiltroAberto(true)}
        >
          <IconFiltro size={22} />
          Filtrar
          {ativos > 0 ? <span className="catalogo-filtro-contagem">{ativos}</span> : null}
        </button>
        {ORDENS_CATALOGO.map((opcao) => (
          <button key={opcao.id} type="button" aria-pressed={ordem === opcao.id} onClick={() => setOrdem(opcao.id)}>
            {opcao.label}
          </button>
        ))}
      </div>

      <p className="catalogo-contagem">
        {total} {total === 1 ? "produto" : "produtos"}
        {buscando ? <> para “{consulta.trim()}” · <a href="/nacoes-unidas/produtos">Limpar busca</a></> : null}
      </p>

      {total === 0 ? (
        <div className="catalogo-vazio">
          <p>
            {buscando
              ? `Não encontramos “${consulta.trim()}”. Confira a digitação, use termos mais amplos ou navegue pelas categorias.`
              : "Não encontramos produtos com esses filtros. Limpe os filtros ou navegue pelas categorias."}
          </p>
          <a className="catalogo-perguntar" href={whatsappHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={unitId} data-track-source="produtos_nacoes_busca_vazia">
            Perguntar à loja pelo WhatsApp
          </a>
        </div>
      ) : (
        <ul className="catalogo-lista">
          {visiveis.flatMap((g) =>
            g.itens.map((item, indice) => {
              const nome = nomeDeExibicao(item.nome);
              const href = `/nacoes-unidas/produtos/${slugify(item.nome)}`;
              const centavos = precoParaCentavos(item.precoFmt);
              return (
                <li key={item.id ?? item.nome} id={indice === 0 && ordem === "recomendados" ? g.id : undefined} className="catalogo-item catalogo-card">
                  <a className="catalogo-card-foto" href={href} aria-label={`Ver ${nome}`}>
                    {item.foto ? <img src={item.foto} alt="" width="120" height="120" loading="lazy" decoding="async" /> : <span aria-hidden="true" />}
                  </a>
                  <h4>
                    <a href={href}>{nome}</a>
                  </h4>
                  {item.isMIP ? (
                    <p className="catalogo-mip">Medicamento isento de prescrição. Leia a bula. Se persistirem os sintomas, o médico deverá ser consultado.</p>
                  ) : null}
                  {ehNbcal(item.nome) ? <p className="catalogo-nbcal">{AVISO_NBCAL}</p> : null}
                  <p className="catalogo-preco">{item.precoFmt}</p>
                  {centavos ? <ReservarBotao unitId={unitId} nome={nome} precoCentavos={centavos} foto={item.foto} compacto /> : null}
                </li>
              );
            }),
          )}
        </ul>
      )}

      {filtroAberto && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
