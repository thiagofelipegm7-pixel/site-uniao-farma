"use client";

import { useEffect, useRef, useState, type KeyboardEvent as Tecla } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "../../analytics";
import { buildWhatsAppUrl, UNITS } from "../../site-config";
import { IconFechar } from "../../reserva/ReservaIcons";
import ReservarBotao from "../../reserva/ReservarBotao";
import { SeloSemReceita } from "../../visual-fase2";
import { precoParaCentavos } from "../../reserva/reserva-store";
import {
  aplicarCatalogo,
  BUSCAS_POPULARES,
  contarFiltrosAtivos,
  contarItens,
  eventoBusca,
  eventoFiltro,
  FAIXAS_PRECO,
  identificarItens,
  normalizarBusca,
  opcoesFiltro,
  ORDENS_CATALOGO,
  sugerirProdutos,
  mensagemItem,
  type FaixaPreco,
  type FiltroCatalogo,
  type GrupoBusca,
  type ItemBusca,
  type OrdemCatalogo,
} from "./busca";
import { slugify } from "./catalogo";

type Props = {
  grupos: GrupoBusca[];
  whatsappHref: string;
  unitId: string;
};

type Selecao = Pick<FiltroCatalogo, "categorias" | "marcas" | "faixas">;

const SELECAO_VAZIA: Selecao = { categorias: [], marcas: [], faixas: [] };
const ORDINAIS = ["1º", "2º", "3º"];
const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function alternar<T extends string>(lista: readonly T[] | undefined, valor: T): T[] {
  const atual = lista ?? [];
  return atual.includes(valor) ? atual.filter((item) => item !== valor) : [...atual, valor];
}

/** Lista do catálogo com busca local. O HTML do servidor já traz tudo, então sem JavaScript a lista continua completa. */
export default function CatalogoLista({ grupos, whatsappHref, unitId }: Props) {
  const base = identificarItens(grupos);
  const opcoes = opcoesFiltro(base);
  const [consulta, setConsulta] = useState("");
  const [ordem, setOrdem] = useState<OrdemCatalogo>("recomendados");
  const [selecao, setSelecao] = useState<Selecao>(SELECAO_VAZIA);
  const [painelAberto, setPainelAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const buscaRef = useRef<HTMLDivElement>(null);
  const filtroRef = useRef<HTMLDivElement>(null);
  const fecharFiltroRef = useRef<HTMLButtonElement>(null);
  const gatilhoFiltroRef = useRef<HTMLButtonElement>(null);
  const filtroEnviado = useRef("");
  const pendenteRef = useRef<string | null>(null);

  const termo = normalizarBusca(consulta);
  const sugestoes = sugerirProdutos(base, consulta);
  const agrupados = aplicarCatalogo(base, { consulta, ordem: "recomendados", ...selecao });
  const visiveis = ordem === "recomendados" ? agrupados : aplicarCatalogo(base, { consulta, ordem, ...selecao });
  const total = contarItens(visiveis);
  const ativos = contarFiltrosAtivos(selecao);
  const buscando = consulta.trim().length > 0;
  const refinando = buscando || ativos > 0 || ordem !== "recomendados";
  const mostrarPainel = painelAberto && (termo.length === 0 || (termo.length >= 2 && sugestoes.length > 0));
  const unit = UNITS.find((u) => u.id === unitId);
  const hrefDoItem = (nome: string, precoFmt: string) =>
    unit ? buildWhatsAppUrl(unit, mensagemItem(nome, precoFmt), { campaign: "produtos_nacoes", content: "nacoes_item" }) : whatsappHref;

  useEffect(() => {
    const evento = eventoBusca(consulta, total);
    if (!evento) return;
    const timer = setTimeout(() => trackEvent(evento.event, evento.params), 1000);
    return () => clearTimeout(timer);
  }, [consulta, total]);

  useEffect(() => {
    const id = pendenteRef.current;
    if (!id) return;
    pendenteRef.current = null;
    document.getElementById(id)?.scrollIntoView({ block: "center" });
  });

  useEffect(() => {
    if (!filtroAberto) return;
    const gatilho = gatilhoFiltroRef.current;
    const fundo = [
      document.querySelector("header"),
      document.querySelector(".brand-strip"),
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

  function escolherPopular(valor: string) {
    setConsulta(valor);
    setPainelAberto(false);
    setIndice(0);
  }

  function irParaItem(item: ItemBusca) {
    setPainelAberto(false);
    if (!item.id) return;
    if (document.getElementById(item.id)) {
      document.getElementById(item.id)?.scrollIntoView({ block: "center" });
      return;
    }
    setConsulta("");
    setOrdem("recomendados");
    setSelecao(SELECAO_VAZIA);
    pendenteRef.current = item.id;
  }

  function aoTeclarBusca(event: Tecla<HTMLInputElement>) {
    if (event.key === "Escape") {
      setPainelAberto(false);
      return;
    }
    const opcoesPainel = termo.length === 0 ? BUSCAS_POPULARES.length : sugestoes.length;
    if (!mostrarPainel || opcoesPainel === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndice((atual) => (atual + 1) % opcoesPainel);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndice((atual) => (atual - 1 + opcoesPainel) % opcoesPainel);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (termo.length === 0) escolherPopular(BUSCAS_POPULARES[indice] ?? BUSCAS_POPULARES[0]);
      else if (sugestoes[indice]) irParaItem(sugestoes[indice]);
    }
  }

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
      <form className="catalogo-busca" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="catalogo-busca-campo">Buscar produto, marca ou categoria</label>
        <div
          className="catalogo-busca-campo"
          ref={buscaRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPainelAberto(false);
          }}
        >
          <input
            id="catalogo-busca-campo"
            type="search"
            role="combobox"
            enterKeyHint="search"
            autoComplete="off"
            aria-expanded={mostrarPainel}
            aria-controls="catalogo-sugestoes"
            aria-autocomplete="list"
            aria-activedescendant={mostrarPainel ? `catalogo-sugestao-${indice}` : undefined}
            placeholder="Ex.: protetor solar, Nivea, dipirona"
            value={consulta}
            onChange={(event) => {
              setConsulta(event.target.value);
              setIndice(0);
              setPainelAberto(true);
            }}
            onFocus={() => setPainelAberto(true)}
            onKeyDown={aoTeclarBusca}
          />
          {buscando ? (
            <button type="button" className="catalogo-busca-limpar" onClick={() => { setConsulta(""); setIndice(0); }} aria-label="Limpar busca">
              ×
            </button>
          ) : null}
          {mostrarPainel ? (
            <div className="catalogo-sugestoes" id="catalogo-sugestoes">
              {termo.length === 0 ? (
                <div>
                  <p className="catalogo-sugestoes-titulo" id="buscas-populares">Buscas populares</p>
                  <ul aria-labelledby="buscas-populares">
                    {BUSCAS_POPULARES.map((valor, i) => (
                      <li key={valor}>
                        <button
                          type="button"
                          id={`catalogo-sugestao-${i}`}
                          className={indice === i ? "catalogo-popular catalogo-sugestao-ativa" : "catalogo-popular"}
                          onClick={() => escolherPopular(valor)}
                        >
                          <span>{ORDINAIS[i]}</span>
                          {valor}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul aria-label="Sugestões de produtos">
                  {sugestoes.map((item, i) => (
                    <li key={item.id ?? item.nome}>
                      <a
                        id={`catalogo-sugestao-${i}`}
                        className={indice === i ? "catalogo-sugestao catalogo-sugestao-ativa" : "catalogo-sugestao"}
                        href={item.id ? `#${item.id}` : "#lista"}
                        onClick={(event) => {
                          event.preventDefault();
                          irParaItem(item);
                        }}
                      >
                        {item.foto ? (
                          <img className="catalogo-sugestao-foto" src={item.foto} alt="" width="44" height="44" />
                        ) : (
                          <span className="catalogo-sugestao-foto catalogo-sugestao-sem-foto" aria-hidden="true" />
                        )}
                        <span className="catalogo-sugestao-nome">{item.nome}</span>
                        <strong className="catalogo-sugestao-preco">{item.precoFmt}</strong>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
        <p className="catalogo-busca-status" role="status" aria-live="polite">
          {refinando ? (total === 0 ? "Nenhum produto encontrado." : `${total} ${total === 1 ? "produto encontrado" : "produtos encontrados"}.`) : ""}
        </p>
      </form>

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
          Filtrar
          {ativos > 0 ? <span className="catalogo-filtro-contagem">{ativos}</span> : null}
        </button>
        {ORDENS_CATALOGO.map((opcao) => (
          <button key={opcao.id} type="button" aria-pressed={ordem === opcao.id} onClick={() => setOrdem(opcao.id)}>
            {opcao.label}
          </button>
        ))}
      </div>

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
        <>
          {ordem === "recomendados" ? (
            <ul className="catalogo-chips" aria-label="Categorias">
              {visiveis.map((g) => (
                <li key={g.id}>
                  <a href={`#${g.id}`}>
                    {g.categoria} ({g.itens.length})
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {visiveis.map((g) => (
            <section key={g.id} className="catalogo-grupo" aria-labelledby={ordem === "recomendados" ? g.id : undefined}>
              {ordem === "recomendados" ? <h3 id={g.id}>{g.categoria}</h3> : null}
              <ul className="catalogo-lista">
                {g.itens.map((item) => (
                  <li key={item.id ?? item.nome} id={item.id} className="catalogo-item">
                    {item.foto ? <img className="catalogo-foto" src={item.foto} alt={item.nome} width="80" height="80" loading="lazy" decoding="async" /> : null}
                    <div className="catalogo-info">
                      <SeloSemReceita />
                      <h4>
                        <a href={`/nacoes-unidas/produtos/${slugify(item.nome)}`}>{item.nome}</a>
                      </h4>
                      {item.lab ? <p className="catalogo-lab">{item.lab}</p> : null}
                      {item.isMIP ? (
                        <p className="catalogo-mip">Medicamento isento de prescrição. Leia a bula. Se persistirem os sintomas, o médico deverá ser consultado.</p>
                      ) : null}
                      <div className="catalogo-reservar">
                        {precoParaCentavos(item.precoFmt) ? (
                          <ReservarBotao unitId={unitId} nome={item.nome} precoCentavos={precoParaCentavos(item.precoFmt) ?? 0} foto={item.foto} />
                        ) : null}
                        <a
                          className="catalogo-acao"
                          href={hrefDoItem(item.nome, item.precoFmt)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Confirmar ${item.nome} no WhatsApp`}
                          data-track-event="whatsapp_click"
                          data-track-unit={unitId}
                          data-track-source="produtos_nacoes_item"
                        >
                          Confirmar no WhatsApp
                        </a>
                      </div>
                    </div>
                    <strong className="catalogo-preco">{item.precoFmt}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {filtroAberto && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </>
  );
}
