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
  contarItens,
  eventoBusca,
  eventoFiltro,
  filtrarGrupos,
  filtrarGruposAlternativos,
  identificarItens,
  normalizarBusca,
  ORDENS_CATALOGO,
  type GrupoBusca,
  type OrdemCatalogo,
} from "./busca";
import {
  assinaturaFiltros,
  atalhosDaBusca,
  calcularFacetas,
  contarSelecionados,
  faixaDePrecos,
  filtrosDaUrl,
  formatarReais,
  predicadoFiltros,
  tituloDaFaceta,
  urlComFiltros,
  type FacetaId,
  type FiltrosLista,
} from "./facetas";
import Facetas, { AtalhosBusca, FiltrosAtivos, type ChipAtivo } from "./Facetas";
import { slugify } from "./catalogo";
import CartaoPanvel from "./CartaoPanvel";
import { Cartao as CartaoRestrito } from "./ListaRestrita";
import type { ItemRestrito } from "./receita";
import { quantidadeDoNome } from "./quantidade";
import Paginacao, { hrefPagina, irParaPagina, paginaDaUrl, POR_PAGINA } from "./Paginacao";
import { useBuscaTolerante } from "./useBuscaTolerante";
import { carregarBuscaIndex, estadoDaLista, grupoRestritos, gruposDoIndice } from "./busca-index";
import EsqueletoGrade from "./EsqueletoGrade";
import { FaixaLista, LateralTopo } from "./ListaDrogasil";

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

const FILTROS_VAZIOS: FiltrosLista = { selecoes: {} };
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function alternar(lista: readonly string[] | undefined, valor: string): string[] {
  const atual = lista ?? [];
  const chave = normalizarBusca(valor);
  return atual.some((item) => normalizarBusca(item) === chave) ? atual.filter((item) => normalizarBusca(item) !== chave) : [...atual, valor];
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
      // Caminho rápido: um arquivo só com o catálogo inteiro (busca-index.json). Se faltar (deploy no meio do caminho), cai nas fatias.
      try {
        const indice = await carregarBuscaIndex();
        if (cancel) return;
        setGrupos(gruposDoIndice(indice, departamento));
        setCarregado(true);
        return;
      } catch (e) {
        if (cancel) return;
        console.warn("Índice da busca indisponível; carregando o catálogo em partes.", e);
      }
      try {
        const idx = await fetch("/dados/nacoes/catalogo-index.json").then(r => r.json());
        type ItemPagina = { slug?: string; nomeExibicao?: string; nome: string; lab: string; isMIP: boolean; restam?: number; esgotado?: boolean; precoFmt: string; preco: number; foto: string | null; tipo?: string };
        const paraItem = (item: ItemPagina) => ({
          nome: item.nomeExibicao || item.nome,
          lab: item.lab,
          isMIP: item.isMIP,
          restam: item.restam,
          esgotado: item.esgotado,
          precoFmt: item.precoFmt,
          preco: item.preco,
          foto: item.foto,
          slug: item.slug,
          tipo: item.tipo,
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
        // Lista geral: soma os medicamentos com receita e controlados (cartão e cesta próprios), para a página mostrar todo o catálogo.
        if (!departamento) {
          try {
            const rIdx = await fetch("/dados/nacoes/restritos-index.json").then((r) => r.json());
            const restritos: ItemRestrito[] = [];
            for (const tipo of ["receita", "controlados"] as const) {
              for (let n = 1; n <= (rIdx[tipo]?.paginas ?? 0); n += 1) {
                const pagina: ItemRestrito[] = await fetch(`/dados/nacoes/restritos/${tipo}/p${n}.json`).then((r) => r.json());
                if (cancel) return;
                restritos.push(...pagina);
              }
            }
            gruposCarregados.push(grupoRestritos(restritos));
            setGrupos([...gruposCarregados]);
          } catch {}
        }
        if (!cancel) setCarregado(true);
      } catch (e) {
        console.error(e);
        // Sem rede: para de mostrar "Buscando…" e deixa a mensagem de vazio com o WhatsApp.
        if (!cancel) setCarregado(true);
      }
    })();
    return () => { cancel = true; };
  }, [gruposProps, departamento]);
  const base = useMemo(() => identificarItens(grupos), [grupos]);
  // A página é estática: o termo vem da barra de endereço (?q=fralda) depois que a página abre.
  const [consulta, setConsulta] = useState(consultaInicial);
  useEffect(() => {
    const ler = () => setConsulta((new URLSearchParams(window.location.search).get("q") ?? "").slice(0, 80));
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);
  const [ordem, setOrdem] = useState<OrdemCatalogo>("recomendados");
  const [filtros, setFiltros] = useState<FiltrosLista>(FILTROS_VAZIOS);
  // Filtros no endereço (?marca=Nivea&preco_max=30): o link compartilhado e o botão Voltar mostram a mesma lista.
  const [urlLida, setUrlLida] = useState(false);
  const mudouPelaUrl = useRef(false);
  useEffect(() => {
    const ler = () => {
      const e = filtrosDaUrl(window.location.search);
      mudouPelaUrl.current = true;
      setFiltros({ selecoes: e.selecoes, precoMin: e.precoMin, precoMax: e.precoMax });
      setOrdem(e.ordem);
      setUrlLida(true);
    };
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);
  useEffect(() => {
    if (!urlLida) return;
    const estado = { ...filtros, ordem };
    if (assinaturaFiltros(filtrosDaUrl(window.location.search)) === assinaturaFiltros(estado)) return;
    window.history.pushState(null, "", urlComFiltros(window.location.href, estado));
  }, [filtros, ordem, urlLida]);
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

  const porTexto = useMemo(
    () => (consultasAlternativas?.length ? filtrarGruposAlternativos(base, consultasAlternativas) : filtrarGrupos(base, consulta)),
    [base, consulta, consultasAlternativas],
  );
  const facetas = useMemo(() => calcularFacetas(porTexto, filtros), [porTexto, filtros]);
  const faixa = useMemo(() => faixaDePrecos(porTexto, filtros), [porTexto, filtros]);
  const visiveis = aplicarCatalogo(porTexto, { ordem, predicado: predicadoFiltros(filtros) });
  const total = contarItens(visiveis);
  const [pagina, setPagina] = useState(paginaInicial);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA);
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const itensDaPagina = visiveis.flatMap((g) => g.itens).slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);
  const primeiraBusca = useRef(true);
  // Mudou a busca, o filtro ou a ordem: volta para a página 1 (menos na primeira carga, que respeita o endereço).
  useEffect(() => {
    if (primeiraBusca.current) {
      primeiraBusca.current = false;
      return;
    }
    // Filtros vindos do endereço (abrir link, Voltar) respeitam a ?pagina= que já está lá.
    if (mudouPelaUrl.current) {
      mudouPelaUrl.current = false;
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- volta à primeira página quando a lista muda
    setPagina(1);
    if (new URLSearchParams(window.location.search).has("pagina")) {
      const u = new URL(window.location.href);
      u.searchParams.delete("pagina");
      window.history.replaceState(null, "", u);
    }
  }, [ordem, filtros, porPagina]);
  // Voltar e avançar do navegador.
  useEffect(() => {
    const ler = () => setPagina(paginaDaUrl(window.location.search));
    ler();
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);
  const ativos = contarSelecionados(filtros);
  const buscando = consulta.trim().length > 0;

  // Enquanto o catálogo (ou a correção de digitação) não termina, a tela mostra "Buscando…", nunca "não encontramos".
  const estado = estadoDaLista({ completo, total, procurando: buscando && tolerante.procurando, buscando });
  const esperando = estado === "carregando" || estado === "procurando";

  // Mede a busca uma vez, só com o resultado final (sem o texto digitado, ver eventoBusca).
  const buscaMedida = useRef<string | null>(null);
  useEffect(() => {
    if (esperando || buscaMedida.current === consulta) return;
    buscaMedida.current = consulta;
    const evento = eventoBusca(consulta, total);
    if (evento) trackEvent(evento.event, evento.params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta, esperando]);

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
    const sel = filtros.selecoes;
    const resumo = { categorias: [...(sel.departamento ?? [])], marcas: [...(sel.marca ?? [])], faixas: [], tipos: [...(sel.categoria ?? [])] };
    const outros = ativos - resumo.categorias.length - resumo.marcas.length - resumo.tipos.length;
    const evento = eventoFiltro(resumo, total, outros);
    if (!evento) {
      filtroEnviado.current = "";
      return;
    }
    const assinatura = assinaturaFiltros({ ...filtros, ordem: "recomendados" });
    if (filtroEnviado.current === assinatura) return;
    filtroEnviado.current = assinatura;
    trackEvent(evento.event, evento.params);
  }, [filtroAberto, filtros, total, ativos]);

  const alternarFaceta = (id: FacetaId, valor: string) =>
    setFiltros((atual) => {
      const proximo = alternar(atual.selecoes[id], valor);
      const selecoes = { ...atual.selecoes };
      if (proximo.length > 0) selecoes[id] = proximo;
      else delete selecoes[id];
      return { ...atual, selecoes };
    });
  const aplicarPreco = (precoMin?: number, precoMax?: number) => setFiltros((atual) => ({ selecoes: atual.selecoes, precoMin, precoMax }));
  const limparFiltros = () => setFiltros(FILTROS_VAZIOS);
  const chips: ChipAtivo[] = [
    ...Object.entries(filtros.selecoes).flatMap(([id, valores]) =>
      (valores ?? []).map((valor) => ({ chave: `${id}:${valor}`, rotulo: `${tituloDaFaceta(id as FacetaId)}: ${valor}`, remover: () => alternarFaceta(id as FacetaId, valor) })),
    ),
    ...(filtros.precoMin !== undefined || filtros.precoMax !== undefined
      ? [{
          chave: "preco",
          rotulo:
            filtros.precoMin !== undefined && filtros.precoMax !== undefined
              ? `Preço: ${formatarReais(filtros.precoMin)} a ${formatarReais(filtros.precoMax)}`
              : filtros.precoMin !== undefined
                ? `Preço: a partir de ${formatarReais(filtros.precoMin)}`
                : `Preço: até ${formatarReais(filtros.precoMax ?? 0)}`,
          remover: () => aplicarPreco(undefined, undefined),
        }]
      : []),
  ];
  const atalhos = buscando ? atalhosDaBusca(facetas) : [];
  const filtrosCampos = (prefixo: string) =>
    esperando ? (
      <p className="fc-carregando">Carregando filtros…</p>
    ) : (
      <Facetas prefixo={prefixo} facetas={facetas} filtros={filtros} faixa={faixa} aoAlternar={alternarFaceta} aoPreco={aplicarPreco} />
    );
  const estadoUrl = { ...filtros, ordem };
  const hrefComFiltros = (n: number) => {
    const u = new URL(urlComFiltros(`https://x.invalid/${hrefPagina(1, consulta)}`, estadoUrl));
    if (n > 1) u.searchParams.set("pagina", String(n));
    return u.search || "?";
  };

  const dialog = (
    <div className="catalogo-filtro-raiz" role="dialog" aria-modal="true" aria-labelledby="catalogo-filtro-titulo" ref={filtroRef}>
      <div className="catalogo-filtro-topo">
        <h2 id="catalogo-filtro-titulo">Filtrar</h2>
        <button ref={fecharFiltroRef} type="button" className="catalogo-filtro-fechar" aria-label="Fechar filtros" onClick={() => setFiltroAberto(false)}>
          <IconFechar size={24} />
        </button>
      </div>
      <div className="catalogo-filtro-corpo">
        {atalhos.length > 1 ? <AtalhosBusca opcoes={atalhos} aoEscolher={(v) => alternarFaceta("categoria", v)} /> : null}
        {filtrosCampos("gaveta")}
      </div>
      <div className="catalogo-filtro-rodape">
        <button type="button" className="catalogo-filtro-limpar" onClick={limparFiltros}>
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
          {buscando ? <h2 className="fc-termo">{tolerante.tipo === "corrigida" ? tolerante.rotulo : consulta.trim()}</h2> : null}
          <LateralTopo total={total} rotulo={buscando ? "resultado" : "produto"} atual={departamento} carregando={esperando} departamentosAbertos={!buscando} />
          {atalhos.length > 1 ? <AtalhosBusca opcoes={atalhos} aoEscolher={(v) => alternarFaceta("categoria", v)} /> : null}
          <div className="pv-filtros-topo">
            <p className="pv-filtros-titulo">Filtros</p>
            {ativos > 0 ? (
              <button type="button" onClick={limparFiltros}>
                Limpar
              </button>
            ) : null}
          </div>
          {filtrosCampos("lateral")}
        </aside>
        <div className="pv-conteudo">
          <div className="pv-topo" role="toolbar" aria-label="Filtrar e ordenar">
            <p className="pv-contagem" aria-live="polite" aria-busy={esperando}>
              {esperando ? (
                <>{estado === "procurando" ? "Procurando o que você quis dizer…" : buscando ? <>Buscando “{consulta.trim()}”…</> : "Carregando produtos…"}</>
              ) : (
                <>
                  <b>{total}</b> {total === 1 ? "produto" : "produtos"}
                  {buscando && !consultasAlternativas ? <> para “{consulta.trim()}” · <a href="/nacoes-unidas/produtos">Limpar busca</a></> : null}
                  {consultasAlternativas ? <> · <a href="/nacoes-unidas/produtos">Limpar busca</a></> : null}
                </>
              )}
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

          </div>
          <FaixaLista
            porPagina={porPagina}
            aoMudarPorPagina={setPorPagina}
            ordem={ordem}
            opcoesOrdem={ORDENS_CATALOGO.map((o) => ({ id: o.id, label: o.id === "recomendados" ? "Mais relevantes" : o.label }))}
            aoMudarOrdem={(id) => setOrdem(id as OrdemCatalogo)}
            paginacao={<Paginacao variante="barra" atual={paginaAtual} total={totalPaginas} href={hrefComFiltros} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />}
          />
          <FiltrosAtivos chips={chips} aoLimpar={limparFiltros} />

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

      {esperando ? (
        <EsqueletoGrade />
      ) : total === 0 ? (
        <div className="catalogo-vazio">
          <p>
            {buscando && tolerante.tipo === "sintoma"
              ? "Para escolher um remédio para o que você está sentindo, converse com o farmacêutico. Ele orienta com segurança e confirma o que a loja tem."
              : consultasAlternativas || ativos > 0
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
              if (item.restrito) return <CartaoRestrito key={item.id ?? item.nome} item={item.restrito} />;
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
                  esgotado={item.esgotado}
                  cesta={centavos && !item.esgotado ? <ReservarBotao unitId={unitId} nome={nome} precoCentavos={centavos} foto={item.foto} variante="cartao" max={item.restam} slug={item.slug} /> : null}
                />
              );
            }),
          )}
        </ul>
      )}
      <Paginacao atual={paginaAtual} total={totalPaginas} href={hrefComFiltros} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />

        </div>
      </div>

      {filtroAberto && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
