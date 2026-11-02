"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: o client navigation do Vinext quebra rotas como /ofertas. */

import { useEffect, useId, useRef, useState } from "react";
import { UNITS, type Unit } from "./site-config";
import { readPreferredUnitId, writePreferredUnitId } from "./preferred-unit";
import { CATEGORIAS_ORDEM, slugify } from "./nacoes-unidas/produtos/catalogo";

const ROTULO: Record<string, string> = {
  "Perfumaria e higiene": "Higiene e perfumaria",
  "Pele e proteção solar": "Pele e sol",
  "Medicamentos isentos de prescrição": "MIPs",
  "Suplementos e alimentos": "Suplementos",
};

/** Busca da casca. O termo vai na URL do catálogo, nunca no analytics. */
export function BuscaLoja() {
  return (
    <form className="casca-busca" role="search" action="/nacoes-unidas/produtos" method="get">
      <label className="sr-only" htmlFor="casca-busca-campo">Buscar produto</label>
      <input
        id="casca-busca-campo"
        name="q"
        type="search"
        placeholder="Buscar produto, ex.: nivea, listerine"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={80}
      />
      <button type="submit" aria-label="Buscar">
        <svg width="22" height="22" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
          <path d="M192,112a80,80,0,1,1-80-80A80,80,0,0,1,192,112Z" opacity="0.2" />
          <path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
        </svg>
      </button>
    </form>
  );
}

export function BarraLoja() {
  const tituloId = useId();
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const [unitId, setUnitId] = useState<Unit["id"] | null>(null);
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    const sync = () => setUnitId(readPreferredUnitId());
    sync();
    window.addEventListener("uf-preferred-unit", sync);
    return () => window.removeEventListener("uf-preferred-unit", sync);
  }, []);

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (!dialogo) return;
    if (aberta && !dialogo.open) dialogo.showModal();
    if (!aberta && dialogo.open) dialogo.close();
  }, [aberta]);

  const loja = UNITS.find((item) => item.id === unitId);

  const escolher = (id: Unit["id"]) => {
    writePreferredUnitId(id);
    setAberta(false);
  };

  return (
    <div className="casca-loja">
      <svg width="26" height="26" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
        <path d="M128,24a80,80,0,0,0-80,80c0,72,80,128,80,128s80-56,80-128A80,80,0,0,0,128,24Zm0,112a32,32,0,1,1,32-32A32,32,0,0,1,128,136Z" opacity="0.2" />
        <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z" />
      </svg>
      <p>
        <span>Retirar ou receber em</span>
        <strong>{loja ? loja.shortName : "Escolha a loja"}</strong>
      </p>
      <button type="button" aria-haspopup="dialog" onClick={() => setAberta(true)}>{loja ? "Trocar" : "Escolher"}</button>
      <dialog
        ref={dialogoRef}
        className="casca-loja-dialogo"
        aria-labelledby={tituloId}
        onCancel={(event) => {
          event.preventDefault();
          setAberta(false);
        }}
        onClick={(event) => {
          if (event.target === dialogoRef.current) setAberta(false);
        }}
      >
        <h2 id={tituloId}>Onde você quer retirar ou receber?</h2>
        <ul>
          {UNITS.map((unit) => (
            <li key={unit.id}>
              <button type="button" onClick={() => escolher(unit.id)}>{unit.shortName}</button>
            </li>
          ))}
        </ul>
        <button type="button" className="casca-loja-fechar" onClick={() => setAberta(false)}>Fechar</button>
      </dialog>
    </div>
  );
}

const ICONE: Record<string, string> = {
  "Perfumaria e higiene": "M184,96.8V88a32,32,0,0,0-32-32H136V32h32a8,8,0,0,1,8,8,8,8,0,0,0,16,0,24,24,0,0,0-24-24H104a8,8,0,0,0,0,16h16V56H104A32,32,0,0,0,72,88v8.8A40.07,40.07,0,0,0,40,136v80a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136A40.07,40.07,0,0,0,184,96.8ZM104,72h48a16,16,0,0,1,16,16v8H88V88A16,16,0,0,1,104,72Zm96,144H56V136a24,24,0,0,1,24-24h96a24,24,0,0,1,24,24v80Z",
  "Pele e proteção solar": "M174,47.75a254.19,254.19,0,0,0-41.45-38.3,8,8,0,0,0-9.18,0A254.19,254.19,0,0,0,82,47.75C54.51,79.32,40,112.6,40,144a88,88,0,0,0,176,0C216,112.6,201.49,79.32,174,47.75ZM128,216a72.08,72.08,0,0,1-72-72c0-57.23,55.47-105,72-118,16.53,13,72,60.75,72,118A72.08,72.08,0,0,1,128,216Z",
  "Medicamentos isentos de prescrição": "M216.43,39.6a53.27,53.27,0,0,0-75.33,0L39.6,141.09a53.26,53.26,0,0,0,75.32,75.31L216.43,114.91A53.32,53.32,0,0,0,216.43,39.6ZM103.61,205.09h0a37.26,37.26,0,0,1-52.7-52.69L96,107.31,148.7,160ZM205.11,103.6,160,148.69,107.32,96l45.1-45.09a37.26,37.26,0,0,1,52.69,52.69Z",
  "Suplementos e alimentos": "M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144Z",
};

export function CategoriasLoja() {
  return (
    <nav className="casca-categorias" aria-label="Categorias">
      <a href="/ofertas">
        <span className="casca-cat-icone is-oferta" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 256 256" fill="currentColor">
            <path d="M237.66,153,153,237.66a8,8,0,0,1-11.31,0L42.34,138.34A8,8,0,0,1,40,132.69V40h92.69a8,8,0,0,1,5.65,2.34l99.32,99.32A8,8,0,0,1,237.66,153Z" opacity="0.2" />
            <path d="M243.31,136,144,36.69A15.86,15.86,0,0,0,132.69,32H40a8,8,0,0,0-8,8v92.69A15.86,15.86,0,0,0,36.69,144L136,243.31a16,16,0,0,0,22.63,0l84.68-84.68a16,16,0,0,0,0-22.63Zm-96,96L48,132.69V48h84.69L232,147.31ZM96,84A12,12,0,1,1,84,72,12,12,0,0,1,96,84Z" />
          </svg>
        </span>
        Ofertas
      </a>
      {CATEGORIAS_ORDEM.map((categoria) => (
        <a key={categoria} href={`/nacoes-unidas/produtos#${slugify(categoria)}`} aria-label={categoria}>
          <span className="casca-cat-icone" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 256 256" fill="currentColor">
              <path d={ICONE[categoria]} />
            </svg>
          </span>
          {ROTULO[categoria] ?? categoria}
        </a>
      ))}
    </nav>
  );
}

/** Destaque da pré-venda. h2: a página já tem o h1 institucional. */
export function CartaoMarinho() {
  return (
    <section className="casca-marinho" aria-label="Destaque">
      <div>
        <h2>Separa pra você: reserve aqui e pague só quando retirar.</h2>
        <p>3 lojas em Sabará · retirada ou entrega no bairro.</p>
      </div>
      <a href="/nacoes-unidas/produtos">Ver produtos</a>
    </section>
  );
}

export function ComoFunciona() {
  const passos = [
    ["Escolha e adicione", "Monte a sua reserva."],
    ["Escolha a loja", "Retirar na loja ou receber no bairro."],
    ["Envie pelo WhatsApp", "A gente confere o preço e o estoque e te responde pelo WhatsApp. Pague no balcão ou na entrega."],
  ] as const;
  return (
    <section className="casca-passos section" aria-labelledby="casca-passos-titulo">
      <div className="section-inner">
        <h2 id="casca-passos-titulo">Como funciona</h2>
        <ol>
          {passos.map(([titulo, texto], indice) => (
            <li key={titulo}>
              <span>{indice + 1}</span>
              <strong>{titulo}</strong>
              <p>{texto}</p>
            </li>
          ))}
        </ol>
        <p className="casca-escopo">Aqui só itens sem receita: medicamentos isentos de prescrição (MIPs), higiene e dermocosméticos. Leia a bula. Em caso de dúvida, procure o farmacêutico.</p>
      </div>
    </section>
  );
}
