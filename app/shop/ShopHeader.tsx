"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useRef, useState } from "react";
import { BUSCAS_POPULARES, normalizarBusca } from "../nacoes-unidas/produtos/busca";
import { buildWhatsAppUrl, UNITS } from "../site-config";
import { formatarCentavos } from "../reserva/reserva-store";
import BrandLogo from "../BrandLogo";
import ReservaSacola from "../reserva/ReservaSacola";
import { IconFechar, IconLupa, IconMenu, IconPino } from "../reserva/ReservaIcons";
import LojaPicker from "./LojaPicker";
import "./shop.css";
import { abrirSeletorDeLoja } from "./loja-evento";

const LINKS = [
  { href: "/nacoes-unidas/produtos", label: "Produtos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/#unidades-rapidas", label: "Lojas" },
  { href: "/receita", label: "Receita" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega" },
  { href: "/perguntas", label: "Perguntas" },
] as const;

/** Cabeçalho de loja virtual: menu, marca, pino de loja, sacola e busca. Sem JavaScript a busca é um formulário GET comum. */
type Sugestao = { nome: string; slug: string; precoCentavos: number; foto: string | null; busca: string };
const ORDINAIS = ["1º", "2º", "3º"];
const nacoes = UNITS.find((unit) => unit.id === "nacoes");

export default function ShopHeader({ consultaInicial = "" }: { consultaInicial?: string }) {
  const [menu, setMenu] = useState(false);
  const [termo, setTermo] = useState(consultaInicial);
  const [foco, setFoco] = useState(false);
  const [itens, setItens] = useState<Sugestao[] | null>(null);
  const carregando = useRef(false);
  const painelRef = useRef<HTMLDivElement>(null);

  // Busca o catálogo uma vez, só quando o cliente toca no campo.
  function carregar() {
    if (itens !== null || carregando.current) return;
    carregando.current = true;
    fetch("/dados/nacoes/catalogo-busca.json", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: Sugestao[] | null) => setItens(Array.isArray(dados) ? dados : []))
      .catch(() => setItens([]));
  }

  const normal = normalizarBusca(termo);
  const termos = normal.split(" ").filter(Boolean);
  const resultados = normal.length >= 2 && itens ? itens.filter((item) => termos.every((t) => item.busca.includes(t))).slice(0, 6) : [];
  const mostrarPainel = foco && (normal.length === 0 || normal.length >= 2);
  const semResultado = normal.length >= 2 && itens !== null && resultados.length === 0;

  useEffect(() => {
    if (!menu) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [menu]);

  return (
    <>
      <header className="shop-header">
        <button type="button" className="shop-icone shop-menu" aria-label="Abrir menu" aria-expanded={menu} aria-controls="shop-menu-painel" onClick={() => setMenu(true)}>
          <IconMenu size={26} />
        </button>
        <a className="shop-marca" href="/">
          <BrandLogo priority />
          <span>União Farma</span>
        </a>
        <form
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
            placeholder="Buscar produto, ex.: nivea, listerine"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" aria-label="Buscar">
            <IconLupa size={22} />
          </button>
          {mostrarPainel ? (
            <div className="shop-sugestoes" id="shop-sugestoes" ref={painelRef}>
              {normal.length === 0 ? (
                <>
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
              ) : resultados.length > 0 ? (
                <>
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
        <div className="shop-acoes">
          <button type="button" className="shop-icone" aria-label="Escolher loja" onClick={abrirSeletorDeLoja}>
            <IconPino size={28} />
          </button>
          <ReservaSacola />
        </div>
      </header>

      {menu ? (
        <div className="shop-menu-raiz" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="shop-menu-fundo" aria-label="Fechar o menu" tabIndex={-1} onClick={() => setMenu(false)} />
          <div className="shop-menu-painel" id="shop-menu-painel">
            <div className="shop-menu-topo">
              <strong>Menu</strong>
              <button type="button" className="reserva-icone" aria-label="Fechar o menu" onClick={() => setMenu(false)}>
                <IconFechar size={24} />
              </button>
            </div>
            <ul>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} onClick={() => setMenu(false)}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <LojaPicker />
    </>
  );
}
