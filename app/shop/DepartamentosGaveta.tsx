"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { useEffect, useRef, useState } from "react";
import { IconFechar, IconSetaDireita, IconVoltar } from "../reserva/ReservaIcons";

type Secao = { id: string; rotulo: string; href: string; tipo: "link" | "marcas"; grupo?: string };
type Marca = { nome: string; busca: string };

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
  { id: "receita-lista", rotulo: "Medicamentos com receita", href: "/nacoes-unidas/produtos/receita", tipo: "link" },
  { id: "controlados-lista", rotulo: "Medicamentos controlados", href: "/nacoes-unidas/produtos/controlados", tipo: "link" },
];

const DURACAO = 220;

/**
 * Gaveta "Departamentos" igual à da Panvel: abre à esquerda sobre um véu, título e × no topo, lista de linhas com seta
 * e, ao tocar numa categoria, o segundo nível ("Voltar", "Ver tudo em …" e as marcas mais frequentes do catálogo).
 */
export default function DepartamentosGaveta({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [montado, setMontado] = useState(aberto);
  const [entrou, setEntrou] = useState(false);
  const [secao, setSecao] = useState<Secao | null>(null);
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

  if (!montado) return null;

  const lista = secao ? marcas[secao.id] : undefined;

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

        {secao === null ? (
          <ul className="depto-lista">
            {SECOES.map((item) => (
              <li key={item.id}>
                {item.tipo === "link" ? (
                  <a href={item.href} onClick={onFechar}>
                    <span>{item.rotulo}</span>
                    <IconSetaDireita size={18} />
                  </a>
                ) : (
                  <button type="button" onClick={() => abrirSecao(item)}>
                    <span>{item.rotulo}</span>
                    <IconSetaDireita size={18} />
                  </button>
                )}
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
        )}
      </div>
    </div>
  );
}
