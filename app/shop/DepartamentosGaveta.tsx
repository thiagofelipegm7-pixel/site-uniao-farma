"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useRef, useState, type KeyboardEvent as TeclaReact } from "react";
import { IconFechar, IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";
import { PUBLIC_UNITS, type Unit } from "../site-config";

type Secao = { id: string; rotulo: string; href: string; tipo: "link" | "marcas"; grupo?: string };
type Marca = { nome: string; busca: string };
type AbaMenu = "departamentos" | "lojas" | "ofertas";

/** Ofertas e as 8 categorias da loja. */
const SECOES: Secao[] = [
  { id: "ofertas", rotulo: "Ofertas", href: "/ofertas", tipo: "link" },
  { id: "medicamentos", rotulo: "Medicamentos", href: "/departamentos/medicamentos", tipo: "marcas", grupo: "medicamentos" },
  { id: "dermo", rotulo: "Dermocosméticos", href: "/departamentos/dermocosmeticos", tipo: "marcas", grupo: "dermocosmeticos" },
  { id: "perfumes", rotulo: "Perfumes", href: "/departamentos/perfumes", tipo: "marcas", grupo: "perfumes" },
  { id: "infantil", rotulo: "Infantil e Gestante", href: "/departamentos/infantil-e-gestante", tipo: "marcas", grupo: "infantil-e-gestante" },
  { id: "beleza", rotulo: "Beleza", href: "/departamentos/beleza", tipo: "marcas", grupo: "beleza" },
  { id: "cuidado", rotulo: "Cuidado Diário", href: "/departamentos/cuidado-diario", tipo: "marcas", grupo: "cuidado-diario" },
  { id: "bem-estar", rotulo: "Bem Estar", href: "/departamentos/bem-estar", tipo: "marcas", grupo: "bem-estar" },
];

const DEPARTAMENTOS = SECOES.filter((item) => item.tipo === "marcas");
const ABAS: { id: AbaMenu; rotulo: string }[] = [
  { id: "departamentos", rotulo: "Departamentos" },
  { id: "lojas", rotulo: "Lojas" },
  { id: "ofertas", rotulo: "Ofertas" },
];


const CAMINHO_LOJA: Record<Unit["id"], string> = {
  fatima: "/fatima",
  nacoes: "/nacoes-unidas",
  itacolomi: "/itacolomi",
};

const DURACAO = 220;

/**
 * Gaveta "Departamentos" igual à da Panvel: abre à esquerda sobre um véu, título e × no topo, lista de linhas com seta
 * e, ao tocar numa categoria, o segundo nível ("Voltar", "Ver tudo em …" e as marcas mais frequentes do catálogo).
 * No celular, o topo ganha abas Departamentos, Lojas e Ofertas no lugar de uma lista só; no desktop a lista continua inteira.
 */
export default function DepartamentosGaveta({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [montado, setMontado] = useState(aberto);
  const [entrou, setEntrou] = useState(false);
  const [secao, setSecao] = useState<Secao | null>(null);
  const [aba, setAba] = useState<AbaMenu>("departamentos");
  const [marcas, setMarcas] = useState<Record<string, Marca[] | "erro">>({});
  const painel = useRef<HTMLDivElement>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  // Entrada e saída animadas (desligadas por prefers-reduced-motion via CSS).
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let quadro = 0;
    if (aberto) {
      quadro = requestAnimationFrame(() => {
        setMontado(true);
        quadro = requestAnimationFrame(() => setEntrou(true));
      });
    } else {
      quadro = requestAnimationFrame(() => setEntrou(false));
      temporizador = setTimeout(() => {
        setMontado(false);
        setSecao(null);
        setAba("departamentos");
      }, DURACAO);
    }
    return () => {
      cancelAnimationFrame(quadro);
      if (temporizador) clearTimeout(temporizador);
    };
  }, [aberto]);

  // Foco no botão de fechar, Esc, travar rolagem e devolver o foco a quem abriu.
  useEffect(() => {
    if (!aberto) return;
    const origem = document.activeElement as HTMLElement | null;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const foco = setTimeout(() => fechar.current?.focus(), 30);
    const aoTeclar = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFechar();
      if (event.key !== "Tab" || !painel.current) return;
      const itens = [...painel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (itens.length === 0) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
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
      clearTimeout(foco);
      document.body.style.overflow = anterior;
      document.removeEventListener("keydown", aoTeclar);
      origem?.focus?.();
    };
  }, [aberto, onFechar]);

  function abrirSecao(item: Secao) {
    if (item.tipo === "link") return;
    setSecao(item);
    if (item.tipo === "marcas" && item.grupo && marcas[item.id] === undefined) {
      fetch(`/api/marcas?grupo=${encodeURIComponent(item.grupo)}`, { headers: { accept: "application/json" } })
        .then((resposta) => (resposta.ok ? resposta.json() : null))
        .then((dados: { marcas?: Marca[] } | null) => setMarcas((atual) => ({ ...atual, [item.id]: dados?.marcas ?? "erro" })))
        .catch(() => setMarcas((atual) => ({ ...atual, [item.id]: "erro" })));
    }
  }

  function trocarAba(proxima: AbaMenu) {
    setAba(proxima);
    setSecao(null);
  }

  function teclarAba(event: TeclaReact<HTMLDivElement>) {
    const ids = ABAS.map((item) => item.id);
    const atual = ids.indexOf(aba);
    if (atual < 0) return;
    let proximo = atual;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") proximo = (atual + 1) % ids.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") proximo = (atual - 1 + ids.length) % ids.length;
    else if (event.key === "Home") proximo = 0;
    else if (event.key === "End") proximo = ids.length - 1;
    else return;
    event.preventDefault();
    trocarAba(ids[proximo]);
    const botao = event.currentTarget.querySelector<HTMLButtonElement>(`#depto-aba-${ids[proximo]}`);
    botao?.focus();
  }

  if (!montado) return null;

  const lista = secao ? marcas[secao.id] : undefined;
  const listaDepartamentos = (
    secao === null ? (
      <ul className="depto-lista">
        <li className="depto-item-ofertas-desktop">
          <a href="/ofertas" onClick={onFechar}>
            <span>Ofertas</span>
            <IconSetaDireita size={18} />
          </a>
        </li>
        {DEPARTAMENTOS.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => abrirSecao(item)}>
              <span>{item.rotulo}</span>
              <IconSetaDireita size={18} />
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <div className="depto-nivel2">
        <button type="button" className="depto-voltar" onClick={() => setSecao(null)}>
          <IconVoltar size={18} /> Voltar
        </button>
        <p className="depto-secao">{secao.rotulo}</p>
        <ul className="depto-lista">
          <li>
            <a href={secao.href} onClick={onFechar}>
              <span>Ver tudo em {secao.rotulo}</span>
              <IconSetaDireita size={18} />
            </a>
          </li>
          {Array.isArray(lista)
            ? lista.map((marca) => (
                <li key={marca.busca}>
                  <a href={`/departamentos/${secao.grupo}?q=${encodeURIComponent(marca.busca)}`} onClick={onFechar}>
                    <span>{marca.nome}</span>
                    <IconSetaDireita size={18} />
                  </a>
                </li>
              ))
            : null}
        </ul>
        {lista === undefined && secao.tipo === "marcas" ? <p className="depto-estado">Carregando…</p> : null}
      </div>
    )
  );

  return (
    <div className={entrou ? "depto-raiz is-aberto" : "depto-raiz"} role="dialog" aria-modal="true" aria-label="Departamentos">
      <button type="button" className="depto-fundo" aria-label="Fechar Departamentos" tabIndex={-1} onClick={onFechar} />
      <div className="depto-painel" ref={painel} id="shop-menu-painel">
        <div className="depto-topo">
          <strong>Departamentos</strong>
          <button ref={fechar} type="button" className="depto-fechar" aria-label="Fechar Departamentos" onClick={onFechar}>
            <IconFechar size={22} />
          </button>
        </div>

        <div className="depto-abas" role="tablist" aria-label="Menu" onKeyDown={teclarAba}>
          {ABAS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`depto-aba-${item.id}`}
              aria-selected={aba === item.id}
              aria-controls={`depto-painel-${item.id}`}
              tabIndex={aba === item.id ? 0 : -1}
              className={aba === item.id ? "is-ativa" : undefined}
              onClick={() => trocarAba(item.id)}
            >
              {item.rotulo}
            </button>
          ))}
        </div>

        <div
          className={aba === "departamentos" ? "depto-tabpanel depto-tabpanel-deptos is-ativa" : "depto-tabpanel depto-tabpanel-deptos"}
          role="tabpanel"
          id="depto-painel-departamentos"
          aria-labelledby="depto-aba-departamentos"
        >
          {listaDepartamentos}
        </div>

        <div
          className={aba === "lojas" ? "depto-tabpanel depto-tabpanel-lojas is-ativa" : "depto-tabpanel depto-tabpanel-lojas"}
          role="tabpanel"
          id="depto-painel-lojas"
          aria-labelledby="depto-aba-lojas"
        >
          <ul className="depto-lista depto-lista-lojas">
            {PUBLIC_UNITS.map((unidade) => (
              <li key={unidade.id}>
                <a href={CAMINHO_LOJA[unidade.id]} onClick={onFechar}>
                  <span className="depto-loja">
                    <strong>{unidade.shortName}</strong>
                    <small>{unidade.address}</small>
                  </span>
                  <IconSetaDireita size={18} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div
          className={aba === "ofertas" ? "depto-tabpanel depto-tabpanel-ofertas is-ativa" : "depto-tabpanel depto-tabpanel-ofertas"}
          role="tabpanel"
          id="depto-painel-ofertas"
          aria-labelledby="depto-aba-ofertas"
        >
          <ul className="depto-lista">
            <li>
              <a href="/ofertas" onClick={onFechar}>
                <span>Ver as ofertas da semana</span>
                <IconSetaDireita size={18} />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
