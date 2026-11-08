"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useMemo, useRef, useState } from "react";
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
  filtrarGrupos,
  FAIXAS_PRECO,
  identificarItens,
  normalizarBusca,
  opcoesFiltro,
  ORDENS_CATALOGO,
  type FaixaPreco,
  type FiltroCatalogo,
  type GrupoBusca,
  type OrdemCatalogo,
} from "./busca";
import { slugify } from "./catalogo";
import CartaoPanvel from "./CartaoPanvel";
import { quantidadeDoNome } from "./quantidade";
import Paginacao, { hrefPagina, irParaPagina, paginaDaUrl, POR_PAGINA } from "./Paginacao";
import { useBuscaTolerante } from "./useBuscaTolerante";

type Props = {
  /** Texto vindo do campo de busca do cabeçalho (?q=). */
  consultaInicial?: string;
  /** Página pedida no endereço (?pagina=), lida no servidor para o HTML já vir com a fatia certa. */
  paginaInicial?: number;
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
export default function CatalogoLista({ grupos: gruposProps, departamento, whatsappHref, unitId, consultaInicial = "", paginaInicial = 1 }: Props) {
  const [grupos, setGrupos] = useState(gruposProps);
  // Falso até o catálogo inteiro estar na tela: a correção de digitação só vale com a lista completa.
  const [carregado, setCarregado] = useState(false);
  useEffect(() => {
    if (gruposProps.length > 0) return;
    let cancel = false;
    (async () => {
      try {
        const idx = await fetch("/dados/nacoes/catalogo-index.json").then(r => r.json());
        type ItemPagina = { slug?: string; nomeExibicao?: string; nome: string; lab: string; isMIP: boolean; restam?: number; precoFmt: string; preco: number; foto: string | null };
        const paraItem = (item: ItemPagina) => ({
          nome: item.nomeExibicao || item.nome,
          lab: item.lab,
          isMIP: item.isMIP,
          restam: item.restam,
          precoFmt: item.precoFmt,
          preco: item.preco,
          foto: item.foto,
          slug: item.slug,
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
        if (!cancel) setCarregado(true);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancel = true; };
  }, [gruposProps, departamento]);
  const base = useMemo(() => identificarItens(grupos), [grupos]);
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

  // Erro de digitação: quando a busca exata não acha nada, tenta corrigir (local primeiro, IA só se precisar).
  const completo = gruposProps.length > 0 || carregado;
  const textosBusca = useMemo(
    () => (completo ? base.flatMap((grupo) => grupo.itens.map((item) => normalizarBusca(`${item.nome} ${item.lab} ${grupo.categoria}`))) : null),
    [completo, base],
  );
  const totalExato = useMemo(() => (consulta.trim() ? filtrarGrupos(base, consulta).reduce((soma, g) => soma + g.itens.length, 0) : 1), [base, consulta]);
  const tolerante = useBuscaTolerante({ textos: textosBusca, consulta, totalExato });
  const consultasAlternativas = tolerante.tipo === "corrigida" ? tolerante.consultas : undefined;

  const visiveis = aplicarCatalogo(base, { consulta, consultasAlternativas, ordem, ...selecao });
  const total = contarItens(visiveis);
  const [pagina, setPagina] = useState(paginaInicial);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensDaPagina = visiveis.flatMap((g) => g.itens).slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);
  const primeiraBusca = useRef(true);
  // Mudou a busca, o filtro ou a ordem: volta para a página 1 (menos na primeira carga, que respeita o endereço).
  useEffect(() => {
    if (primeiraBusca.current) {
      primeiraBusca.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- volta à primeira página quando a lista muda
    setPagina(1);
    if (new URLSearchParams(window.location.search).has("pagina")) {
      const u = new URL(window.location.href);
      u.searchParams.delete("pagina");
      window.history.replaceState(null, "", u);
    }
  }, [ordem, selecao]);
  // Voltar e avançar do navegador.
  useEffect(() => {
    const ler = () => setPagina(paginaDaUrl(window.location.search));
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);
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

  const filtrosCampos = (
    <>
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
    </>
  );

  const dialog = (
    <div className="catalogo-filtro-raiz" role="dialog" aria-modal="true" aria-labelledby="catalogo-filtro-titulo" ref={filtroRef}>
      <div className="catalogo-filtro-topo">
        <h2 id="catalogo-filtro-titulo">Filtrar</h2>
        <button ref={fecharFiltroRef} type="button" className="catalogo-filtro-fechar" aria-label="Fechar filtros" onClick={() => setFiltroAberto(false)}>
          <IconFechar size={24} />
        </button>
      </div>
      <div className="catalogo-filtro-corpo">
        {filtrosCampos}
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
      <div className="pv-layout">
        <aside className="pv-filtros" aria-label="Filtros">
          <div className="pv-filtros-topo">
            <p className="pv-filtros-titulo">Filtros</p>
            {ativos > 0 ? (
              <button type="button" onClick={() => setSelecao(SELECAO_VAZIA)}>
                Limpar
              </button>
            ) : null}
          </div>
          {filtrosCampos}
        </aside>
        <div className="pv-conteudo">
          <div className="pv-topo" role="toolbar" aria-label="Filtrar e ordenar">
            <p className="pv-contagem">
              <b>{total}</b> {total === 1 ? "produto" : "produtos"}
              {buscando && !consultasAlternativas ? <> para “{consulta.trim()}” · <a href="/nacoes-unidas/produtos">Limpar busca</a></> : null}
              {consultasAlternativas ? <> · <a href="/nacoes-unidas/produtos">Limpar busca</a></> : null}
            </p>
            <button
              ref={gatilhoFiltroRef}
              type="button"
              className="catalogo-filtrar pv-filtrar"
              aria-haspopup="dialog"
              aria-expanded={filtroAberto}
              aria-label={ativos > 0 ? `Filtrar, ${ativos} ${ativos === 1 ? "filtro ativo" : "filtros ativos"}` : "Filtrar"}
              onClick={() => setFiltroAberto(true)}
            >
              <IconFiltro size={20} />
              Filtrar
              {ativos > 0 ? <span className="catalogo-filtro-contagem">{ativos}</span> : null}
            </button>
            <label className="pv-ordenar">
              <span>Ordenar por</span>
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemCatalogo)}>
                {ORDENS_CATALOGO.map((opcao) => (
                  <option key={opcao.id} value={opcao.id}>
                    {opcao.id === "recomendados" ? "Mais relevantes" : opcao.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

      {tolerante.tipo === "sugestao" ? (
        <p className="pv-corrigida" role="status">
          Não encontramos “{consulta.trim()}”. Você quis dizer <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(tolerante.sugestao)}`}><strong>{tolerante.sugestao}</strong></a>?
        </p>
      ) : null}

      {tolerante.tipo === "corrigida" ? (
        <p className="pv-corrigida" role="status">
          Mostrando resultados para: <strong>{tolerante.rotulo}</strong>
        </p>
      ) : null}

      {total === 0 ? (
        <div className="catalogo-vazio">
          <p>
            {buscando && tolerante.tipo === "sintoma"
              ? "Para escolher um remédio para o que você está sentindo, converse com o farmacêutico. Ele orienta com segurança e confirma o que a loja tem."
              : buscando && tolerante.procurando
                ? "Procurando o que você quis dizer…"
                : consultasAlternativas
                ? "Não encontramos produtos com esses filtros. Limpe os filtros ou navegue pelas categorias."
                : buscando
              ? `Não encontramos “${consulta.trim()}”. Confira a digitação, use termos mais amplos ou navegue pelas categorias.`
              : "Não encontramos produtos com esses filtros. Limpe os filtros ou navegue pelas categorias."}
          </p>
          <a className="catalogo-perguntar" href={whatsappHref} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={unitId} data-track-source="produtos_nacoes_busca_vazia">
            Perguntar à loja pelo WhatsApp
          </a>
        </div>
      ) : (
        <ul className="catalogo-lista pv-grade">
          {[itensDaPagina].flatMap((lista) =>
            lista.map((item) => {
              const nome = nomeDeExibicao(item.nome);
              const href = `/nacoes-unidas/produtos/${item.slug ?? slugify(item.nome)}`;
              const centavos = precoParaCentavos(item.precoFmt);
              return (
                <CartaoPanvel
                  key={item.id ?? item.nome}
                  href={href}
                  nome={nome}
                  foto={item.foto}
                  marca={item.lab}
                  apresentacao={quantidadeDoNome(item.nome)}
                  precoFmt={item.precoFmt}
                  restam={item.restam}
                  cesta={centavos ? <ReservarBotao unitId={unitId} nome={nome} precoCentavos={centavos} foto={item.foto} variante="cesta" compacto max={item.restam} slug={item.slug} /> : null}
                />
              );
            }),
          )}
        </ul>
      )}
      <Paginacao atual={paginaAtual} total={totalPaginas} href={(n) => hrefPagina(n, consulta)} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />

        </div>
      </div>

      {filtroAberto && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
