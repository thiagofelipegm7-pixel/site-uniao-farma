"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useMemo, useRef, useState } from "react";
import { BUSCAS_POPULARES, normalizarBusca, termosDeBusca } from "../nacoes-unidas/produtos/busca";
import { analisarConsulta, casaConsulta, contarCasos, criarVocabulario } from "../nacoes-unidas/produtos/busca-tolerante";
import { buildWhatsAppUrl, UNITS } from "../site-config";
import { formatarCentavos } from "../reserva/reserva-store";
import MarcaUniao from "./MarcaUniao";
import BotaoVoz from "./BotaoVoz";
import BotaoReceita from "../receita-foto/BotaoReceita";
import ReservaSacola from "../reserva/ReservaSacola";
import { IconLupa, IconMenu, IconPino, IconWhats } from "../reserva/ReservaIcons";
import LojaPicker from "./LojaPicker";
import "./shop.css";
import { imagemIlustrativa } from "../nacoes-unidas/produtos/receita";
import DepartamentosGaveta from "./DepartamentosGaveta";
import { abrirSeletorDeLoja, EVENTO_ABRIR_DEPARTAMENTOS } from "./loja-evento";

const LINKS = [
  { href: "/nacoes-unidas/produtos", label: "Produtos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/#unidades-rapidas", label: "A loja" },
  { href: "/receita", label: "Receita" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega" },
  { href: "/perguntas", label: "Perguntas" },
] as const;

/** Cabeçalho de loja virtual: menu, marca, pino de loja, sacola e busca. Sem JavaScript a busca é um formulário GET comum. */
type Sugestao = { nome: string; slug: string; precoCentavos: number; foto: string | null; busca: string };
type SugestaoRestrita = { nome: string; nomeOriginal: string; tipo: "receita" | "controlados" | "consulte"; precoCentavos: number | null; busca: string; q: string; apresentacao: string | null; tarja: "vermelha" | "vermelha-retencao" | "preta" | null; retencao: boolean | null; controlado: boolean; generico?: boolean; ativo?: string | null };
const ROTA_RESTRITA = { receita: "/nacoes-unidas/produtos/receita", controlados: "/nacoes-unidas/produtos/controlados", consulte: "/nacoes-unidas/produtos/consulte-o-farmaceutico" } as const;
const ORDINAIS = ["1º", "2º", "3º"];
const nacoes = UNITS.find((unit) => unit.id === "nacoes");

export default function ShopHeader({ consultaInicial = "" }: { consultaInicial?: string }) {
  const [menu, setMenu] = useState(false);
  const [termo, setTermo] = useState(consultaInicial);
  const [foco, setFoco] = useState(false);
  const [itens, setItens] = useState<Sugestao[] | null>(null);
  const [restritos, setRestritos] = useState<SugestaoRestrita[]>([]);
  const [vozAtiva, setVozAtiva] = useState(false);
  const carregando = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);

  // Busca o catálogo uma vez, só quando o cliente toca no campo.
  function carregar() {
    if (itens !== null || carregando.current) return;
    carregando.current = true;
    fetch("/dados/nacoes/catalogo-busca.json", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: Sugestao[] | null) => setItens(Array.isArray(dados) ? dados : []))
      .catch(() => setItens([]));
    fetch("/dados/nacoes/restritos-busca.json", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: SugestaoRestrita[] | null) => setRestritos(Array.isArray(dados) ? dados : []))
      .catch(() => setRestritos([]));
  }

  const normal = normalizarBusca(termo);
  const termos = termosDeBusca(termo);
  const exatos = normal.length >= 2 && itens ? itens.filter((item) => termos.every((t) => item.busca.includes(t))) : [];
  const exatosRestritos = normal.length >= 2 ? restritos.filter((item) => termos.every((t) => item.busca.includes(t))) : [];
  // Digitou errado e nada casou? Corrige com o vocabulário do catálogo (local e instantâneo, sem IA no painel).
  const vocab = useMemo(() => (itens && itens.length > 0 ? criarVocabulario([...itens.map((i) => i.busca), ...restritos.map((i) => i.busca)]) : null), [itens, restritos]);
  const corrigida = useMemo(() => {
    if (!vocab || normal.length < 3 || exatos.length > 0 || exatosRestritos.length > 0) return null;
    const analise = analisarConsulta(vocab, termo);
    if (analise.sintoma || !analise.corrigida || contarCasos(vocab, analise.corrigida) === 0) return null;
    return analise.corrigida;
  }, [vocab, normal, termo, exatos.length, exatosRestritos.length]);
  const resultados = (corrigida ? (itens ?? []).filter((item) => casaConsulta(item.busca, corrigida)) : exatos).slice(0, 6);
  // Medicamentos com receita e controlados também aparecem na busca (lista de preços, sem cesta).
  const resultadosRestritos = (corrigida ? restritos.filter((item) => casaConsulta(item.busca, corrigida)) : exatosRestritos).slice(0, 4);
  const mostrarPainel = foco && !vozAtiva && (normal.length === 0 || normal.length >= 2);
  const semResultado = normal.length >= 2 && itens !== null && resultados.length === 0 && resultadosRestritos.length === 0;

  // Na página de produtos, a caixa já abre com o termo buscado (?q=fralda).
  useEffect(() => {
    if (window.location.pathname.startsWith("/nacoes-unidas/produtos") || window.location.pathname.startsWith("/departamentos")) {
      const q = new URLSearchParams(window.location.search).get("q");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a página é estática: o termo só existe na barra de endereço, depois que a página abre
      if (q) setTermo(q.slice(0, 80));
    }
  }, []);

  // Abre a gaveta "Departamentos" pelo botão do cabeçalho do desktop.
  useEffect(() => {
    const abrir = () => setMenu(true);
    window.addEventListener(EVENTO_ABRIR_DEPARTAMENTOS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_DEPARTAMENTOS, abrir);
  }, []);

  return (
    <>
      <div className="shop-faixa-topo" aria-hidden="true" />
      <header className="shop-header">
        <button type="button" className="shop-icone shop-menu" aria-label="Abrir menu" aria-expanded={menu} aria-controls="shop-menu-painel" onClick={() => setMenu(true)}>
          <IconMenu size={26} />
        </button>
        <a className="shop-marca" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
          <MarcaUniao />
        </a>
        {nacoes ? (
          <a className="shop-whats" href={buildWhatsAppUrl(nacoes, "Oi, União Farma!", { campaign: "cabecalho", content: "nacoes" })} data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="cabecalho" target="_blank" rel="noreferrer">
            <IconWhats size={26} />
            <span>WhatsApp<strong>{nacoes.whatsapp}</strong></span>
          </a>
        ) : null}
        <form
          ref={formRef}
          className="shop-busca"
          role="search"
          action="/nacoes-unidas/produtos"
          method="get"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFoco(false);
          }}
        >
          <label className="sr-only" htmlFor="shop-busca-q">Buscar produto</label>
          <input
            id="shop-busca-q"
            name="q"
            type="search"
            value={termo}
            onChange={(event) => setTermo(event.target.value)}
            onFocus={() => {
              setFoco(true);
              carregar();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setFoco(false);
              if (event.key === "ArrowDown") {
                event.preventDefault();
                painelRef.current?.querySelector<HTMLElement>("a")?.focus();
              }
            }}
            role="combobox"
            aria-expanded={mostrarPainel}
            aria-controls="shop-sugestoes"
            aria-autocomplete="list"
            placeholder="Buscar na União Farma"
            autoComplete="off"
            enterKeyHint="search"
          />
          <BotaoVoz
            contexto="cabecalho"
            onAtividade={setVozAtiva}
            onTexto={(texto) => {
              setTermo(texto);
              carregar();
              // Deixa o cliente ver o que foi entendido por um instante e então busca (a busca tolerante e a IA ajudam a achar).
              window.setTimeout(() => formRef.current?.requestSubmit(), 450);
            }}
          />
          <button type="submit" aria-label="Buscar">
            <IconLupa size={22} />
          </button>
          {mostrarPainel ? (
            <div className="shop-sugestoes" id="shop-sugestoes" ref={painelRef}>
              {normal.length === 0 ? (
                <>
                  <div className="shop-sugestoes-receita">
                    <BotaoReceita aoAbrir={() => setFoco(false)} classe="receita-gatilho-bloco" rotulo="Tenho uma receita: ler a foto" />
                  </div>
                  <p className="shop-sugestoes-titulo">Buscas populares</p>
                  <ul>
                    {BUSCAS_POPULARES.map((valor, i) => (
                      <li key={valor}>
                        <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(valor)}`}>
                          <strong>{ORDINAIS[i]}</strong>
                          <span>{valor}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : resultados.length > 0 || resultadosRestritos.length > 0 ? (
                <>
                  {corrigida ? (
                    <p className="shop-sugestoes-corrigida" role="status">
                      Mostrando resultados para: <strong>{corrigida}</strong>
                    </p>
                  ) : null}
                  <ul aria-label="Produtos sugeridos">
                    {resultados.map((item) => (
                      <li key={item.slug}>
                        <a href={`/nacoes-unidas/produtos/${item.slug}`}>
                          {item.foto ? <img src={item.foto} alt="" width="44" height="44" /> : <span className="shop-sug-sem-foto" aria-hidden="true" />}
                          <span>{item.nome}</span>
                          <strong>{formatarCentavos(item.precoCentavos)}</strong>
                        </a>
                      </li>
                    ))}
                    {resultadosRestritos.map((item) => (
                      <li key={`${item.tipo}-${item.nome}`}>
                        <a href={`${ROTA_RESTRITA[item.tipo]}?q=${encodeURIComponent(item.q)}`}>
                          <img src={imagemIlustrativa({ ...item, nome: item.nomeOriginal })} alt="" width="44" height="44" />
                          <span>
                            {item.nome}
                          </span>
                          <strong>{item.precoCentavos === null ? "" : formatarCentavos(item.precoCentavos)}</strong>
                        </a>
                      </li>
                    ))}
                  </ul>
                  <a className="shop-sugestoes-todos" href={`/nacoes-unidas/produtos?q=${encodeURIComponent(termo.trim())}`}>
                    Ver todos os resultados
                  </a>
                </>
              ) : semResultado ? (
                <div className="shop-sugestoes-vazio">
                  <strong>Não encontramos “{termo.trim()}”</strong>
                  <p>Confira a digitação, use termos mais amplos ou navegue pelas categorias.</p>
                  {nacoes ? (
                    <a href={buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Não achei um produto no site. Pode me ajudar?", { campaign: "busca_vazia", content: "cabecalho" })} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit="nacoes" data-track-source="busca_vazia_cabecalho">
                      Perguntar à loja pelo WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="shop-sugestoes-titulo">Buscando…</p>
              )}
            </div>
          ) : null}
        </form>
        <nav className="shop-links" aria-label="Menu principal">
          {LINKS.slice(0, 4).map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        <span className="shop-vazio shop-vazio-sino" aria-hidden="true" />
        <span className="shop-vazio shop-vazio-usuario" aria-hidden="true" />
        <div className="shop-acoes">
          <button type="button" className="shop-icone" aria-label="Escolher loja" onClick={abrirSeletorDeLoja}>
            <IconPino size={28} />
          </button>
          <ReservaSacola />
        </div>
      </header>

      <DepartamentosGaveta aberto={menu} onFechar={() => setMenu(false)} />
      <LojaPicker />
    </>
  );
}
