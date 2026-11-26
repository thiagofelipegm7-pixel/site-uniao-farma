"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */

import { usePathname } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BUSCAS_POPULARES, casaTermo, normalizarBusca, termosDaConsulta } from "../nacoes-unidas/produtos/busca";
import { carregarBuscasRecentes, guardarBuscasRecentes, registrarBusca, removerBusca } from "./buscas-recentes";
import { criarReconhecimento, limparFala, mensagemDeErroDeFala, type ReconhecimentoFala } from "./busca-voz";
import { atalhosDaBusca, destacarTrechos, melhoresResultados } from "./busca-painel";
import { analisarConsulta, casaConsulta, contarCasos, criarVocabulario } from "../nacoes-unidas/produtos/busca-tolerante";
import { buildWhatsAppUrl, UNITS } from "../site-config";
import { formatarCentavos } from "../reserva/reserva-store";
import SemFoto from "../nacoes-unidas/produtos/SemFoto";
import SalvarNaLista from "./SalvarNaLista";
import MarcaUniao from "./MarcaUniao";
import BotaoReceita from "../receita-foto/BotaoReceita";
import ReservaSacola from "../reserva/ReservaSacola";
import FotosNovas from "./FotosNovas";
import { IconMenu, IconPino } from "../reserva/ReservaIcons";
import LogoWhatsApp from "../LogoWhatsApp";
import LojaPicker from "./LojaPicker";
import EntregarEm from "./EntregarEm";
import { getUnitOpenStatus } from "../unit-hours";
import "./shop.css";
import "./busca-hero.css";
import { imagemIlustrativa } from "../nacoes-unidas/produtos/receita";
import DepartamentosGaveta from "./DepartamentosGaveta";
import { abrirSeletorDeLoja, EVENTO_ABRIR_DEPARTAMENTOS } from "./loja-evento";
import { SubmenuHome } from "./HomeBlocos";

const LINKS = [
  { href: "/nacoes-unidas/produtos", label: "Produtos" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/#unidades-rapidas", label: "A loja" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega" },
  { href: "/perguntas", label: "Perguntas" },
] as const;

/** Cabeçalho de loja virtual: menu, marca, pino de loja, sacola e busca. Sem JavaScript a busca é um formulário GET comum. */
type Sugestao = { nome: string; slug: string; precoCentavos: number; foto: string | null; busca: string };
type SugestaoRestrita = { nome: string; nomeOriginal: string; tipo: "receita" | "controlados" | "consulte"; precoCentavos: number | null; busca: string; q: string; apresentacao: string | null; tarja: "vermelha" | "vermelha-retencao" | "preta" | null; retencao: boolean | null; controlado: boolean; portaria344?: boolean; semVenda?: boolean; generico?: boolean; ativo?: string | null };
const ROTA_RESTRITA = { receita: "/nacoes-unidas/produtos/receita", controlados: "/nacoes-unidas/produtos/controlados", consulte: "/nacoes-unidas/produtos/consulte-o-farmaceutico" } as const;
const ORDINAIS = ["1º", "2º", "3º", "4º", "5º", "6º", "7º", "8º", "9º", "10º"] as const;
/** Exemplos que se revezam no campo de busca vazio: só produtos de uso comum (nada de medicamento, para não sugerir remédio). */
const EXEMPLOS_BUSCA = ["fralda", "protetor solar", "shampoo", "desodorante", "pasta de dente", "lenço umedecido", "sabonete líquido", "absorvente"] as const;
const nacoes = UNITS.find((unit) => unit.id === "nacoes");

/** Segunda linha do cabeçalho (desktop): o que a loja grande deixa sempre à vista. Departamentos abre a gaveta; os demais são páginas do site. */
const LINKS_LINHA2 = [
  { href: "/ofertas", label: "Ofertas" },
  { href: "/nacoes-unidas/produtos", label: "Todos os produtos" },
  { href: "/entrega-de-medicamentos-em-sabara", label: "Entrega" },
  { href: "/#unidades-rapidas", label: "A loja" },
  { href: "/perguntas", label: "Perguntas" },
  { href: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
] as const;

/** Endereço do produto restrito (receita/controlado): o catálogo de busca não traz o slug, ele sai do nome original. */
function slugDoRestrito(item: { nome: string; nomeOriginal: string }): string {
  return (item.nomeOriginal || item.nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

let vocabEmMemoria: { itens: Sugestao[]; restritos: SugestaoRestrita[]; vocab: ReturnType<typeof criarVocabulario> } | null = null;

/** Vocabulário da correção de digitação, montado só quando precisa e guardado enquanto os dados forem os mesmos. */
function vocabularioDe(itens: Sugestao[], restritos: SugestaoRestrita[]) {
  if (!vocabEmMemoria || vocabEmMemoria.itens !== itens || vocabEmMemoria.restritos !== restritos) {
    vocabEmMemoria = { itens, restritos, vocab: criarVocabulario([...itens.map((i) => i.busca), ...restritos.map((i) => i.busca)]) };
  }
  return vocabEmMemoria.vocab;
}

/** Primeiros `n` itens que passam no teste (para de percorrer a lista ao achar). */
function primeiros<T>(lista: readonly T[], passa: (item: T) => boolean, n: number): T[] {
  const saida: T[] = [];
  for (const item of lista) {
    if (passa(item)) {
      saida.push(item);
      if (saida.length >= n) break;
    }
  }
  return saida;
}

/** Nome do produto com o trecho digitado em destaque (<mark>). */
function NomeDestacado({ nome, termos }: { nome: string; termos: readonly string[] }) {
  return (
    <>
      {destacarTrechos(nome, termos).map((trecho, i) => (trecho.destaque ? <mark key={i}>{trecho.texto}</mark> : trecho.texto))}
    </>
  );
}

export default function ShopHeader({ consultaInicial = "" }: { consultaInicial?: string }) {
  const [menu, setMenu] = useState(false);
  // Fátima e Itacolomi só têm informações institucionais (sem pedido): o botão de pedido pelo WhatsApp é da loja Nações Unidas.
  const pedidoPeloWhats = !/^\/(fatima|itacolomi)(\/|$)/.test(usePathname() || "/");
  const [termo, setTermo] = useState(consultaInicial);
  const [foco, setFoco] = useState(false);
  const [recentes, setRecentes] = useState<string[]>([]);
  // Exemplo mostrado no campo vazio: a primeira pintura é sempre a frase fixa (igual no servidor); o revezamento começa depois de abrir a página.
  const [exemplo, setExemplo] = useState(-1);
  // Busca por voz: o botão só aparece onde o navegador sabe ouvir; `ouvindo` e `avisoVoz` alimentam a região de status.
  const [vozDisponivel, setVozDisponivel] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState("");
  const reconhecimento = useRef<ReconhecimentoFala | null>(null);
  // "Aberto agora": a hora só existe no navegador (a página é estática).
  const [agora, setAgora] = useState<Date | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- a hora só existe no navegador
  useEffect(() => setAgora(new Date()), []);
  const statusLoja = nacoes && agora ? getUnitOpenStatus(nacoes, agora) : null;
  const [itens, setItens] = useState<Sugestao[] | null>(null);
  const [restritos, setRestritos] = useState<SugestaoRestrita[]>([]);
  // A lista de receita/controlados chega em outro arquivo: sem ela, "Não encontramos" pode ser falso (ex.: nome de controlado).
  const [restritosCarregados, setRestritosCarregados] = useState(false);
  // Produtos esgotados: só o painel de busca usa (mostra "Esgotado"). Baixa na primeira digitação; null = ainda não carregou.
  const [esgotados, setEsgotados] = useState<Sugestao[] | null>(null);
  const carregandoEsgotados = useRef(false);
  const carregando = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  // Dedo (ou mouse) no painel de sugestões: no iPhone tocar num link tira o foco do campo antes do clique e o painel sumia sem abrir o produto.
  const tocandoPainel = useRef(false);
  const fimToque = useRef<number | undefined>(undefined);

  // Buscas recentes: só neste aparelho. Lê ao montar (o armazenamento só existe no navegador).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- lê o armazenamento do navegador depois que a página abre
  useEffect(() => setRecentes(carregarBuscasRecentes()), []);
  function lembrarBusca(texto: string) {
    const nova = registrarBusca(recentes, texto);
    setRecentes(nova);
    guardarBuscasRecentes(nova);
  }
  function esquecerBusca(texto: string | null) {
    const nova = texto === null ? [] : removerBusca(recentes, texto);
    setRecentes(nova);
    guardarBuscasRecentes(nova);
  }

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
      .catch(() => setRestritos([]))
      .finally(() => setRestritosCarregados(true));
  }

  // O campo responde na hora; a busca nos produtos acompanha logo atrás (não trava a digitação no celular).
  const termoBusca = useDeferredValue(termo);
  const normal = normalizarBusca(termoBusca);
  const termos = termosDaConsulta(termoBusca);
  // Só os primeiros resultados são mostrados: para de procurar ao achar o suficiente.
  const exatos = useMemo(() => (normal.length >= 2 && itens ? melhoresResultados(itens, (item) => termos.every((t) => casaTermo(item.busca, t)), termos, (item) => item.nome, (item) => item.foto !== null, 6) : []), [normal, itens]); // eslint-disable-line react-hooks/exhaustive-deps -- `termos` vem de `normal`
  const exatosRestritos = useMemo(() => (normal.length >= 2 ? melhoresResultados(restritos, (item) => termos.every((t) => item.busca.split(" ").some((palavra) => palavra.startsWith(t))), termos, (item) => item.nome, () => false, 4) : []), [normal, restritos]); // eslint-disable-line react-hooks/exhaustive-deps -- `termos` vem de `normal`
  const exatosEsgotados = useMemo(() => (normal.length >= 2 && esgotados ? melhoresResultados(esgotados, (item) => termos.every((t) => casaTermo(item.busca, t)), termos, (item) => item.nome, (item) => item.foto !== null, 1) : []), [normal, esgotados]); // eslint-disable-line react-hooks/exhaustive-deps -- `termos` vem de `normal`
  // Digitou errado e nada casou? Corrige com o vocabulário do catálogo (local, sem IA no painel). O vocabulário só é montado na primeira vez que precisa.
  const analise = useMemo(() => {
    if (!itens || itens.length === 0 || normal.length < 3 || exatos.length > 0 || exatosRestritos.length > 0 || exatosEsgotados.length > 0) return null;
    const vocab = vocabularioDe(itens, restritos);
    const a = analisarConsulta(vocab, termoBusca);
    if (a.sintoma) return null;
    // Sem correção de digitação: jeito de falar equivalente ("fralda adulto") ou, por último, parte das palavras ("shampoo anticaspa" → shampoo).
    const corrigidaBase = a.corrigida && contarCasos(vocab, a.corrigida) > 0 ? a.corrigida : null;
    return {
      corrigida: corrigidaBase ?? a.alternativas[0] ?? (a.sugerida ? null : (a.parcial?.consulta ?? null)),
      // Parecida demais com outro produto para trocar sozinho: só pergunta.
      sugerida: a.sugerida && contarCasos(vocab, a.sugerida) > 0 ? a.sugerida : null,
    };
  }, [itens, restritos, normal, termoBusca, exatos.length, exatosRestritos.length, exatosEsgotados.length]);
  const corrigida = analise?.corrigida ?? null;
  const sugerida = analise?.sugerida ?? null;
  const termosCorrigidos = useMemo(() => (corrigida ? termosDaConsulta(corrigida) : []), [corrigida]);
  const resultados = corrigida ? melhoresResultados(itens ?? [], (item) => casaConsulta(item.busca, corrigida), termosCorrigidos, (item) => item.nome, (item) => item.foto !== null, 6) : exatos;
  // Medicamentos com receita e controlados também aparecem na busca (lista de preços, sem cesta).
  const resultadosRestritos = corrigida ? melhoresResultados(restritos, (item) => casaConsulta(item.busca, corrigida), termosCorrigidos, (item) => item.nome, () => false, 4) : exatosRestritos;
  // Esgotados que casam com a busca: aparecem depois dos que têm estoque, para o cliente saber que o produto existe mas acabou.
  const resultadosEsgotados = useMemo(
    () => (normal.length >= 2 && esgotados ? melhoresResultados(esgotados, (item) => (corrigida ? casaConsulta(item.busca, corrigida) : termos.every((t) => casaTermo(item.busca, t))), corrigida ? termosCorrigidos : termos, (item) => item.nome, (item) => item.foto !== null, 3) : []),
    [normal, esgotados, corrigida], // eslint-disable-line react-hooks/exhaustive-deps -- `termos` vem de `normal`
  );
  const atalhos = useMemo(() => atalhosDaBusca(termoBusca), [termoBusca]);
  const termosDestaque = corrigida ? termosCorrigidos : termos;
  const mostrarPainel = foco && (normal.length === 0 || normal.length >= 2);
  const semResultado = normal.length >= 2 && itens !== null && esgotados !== null && restritosCarregados && resultados.length === 0 && resultadosRestritos.length === 0 && resultadosEsgotados.length === 0;

  // Com o teclado aberto (iPhone), a lista não pode passar por baixo dele: limita a altura ao que sobra na tela visível, com rolagem.
  useEffect(() => {
    if (!mostrarPainel) return;
    const vv = window.visualViewport;
    const ajustar = () => {
      const painel = painelRef.current;
      if (!painel || !vv) return;
      const topo = painel.getBoundingClientRect().top - vv.offsetTop;
      painel.style.maxHeight = `${Math.max(140, Math.floor(vv.height - topo - 12))}px`;
    };
    ajustar();
    vv?.addEventListener("resize", ajustar);
    vv?.addEventListener("scroll", ajustar);
    return () => {
      vv?.removeEventListener("resize", ajustar);
      vv?.removeEventListener("scroll", ajustar);
      if (painelRef.current) painelRef.current.style.maxHeight = "";
    };
  }, [mostrarPainel, itens]);

  // Baixa os produtos da busca assim que a página sossega, para a primeira digitação já achar (antes só começava ao tocar no campo).
  useEffect(() => {
    const pedir = () => carregar();
    const ocioso = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = ocioso ? ocioso(pedir, { timeout: 4000 }) : window.setTimeout(pedir, 2000);
    return () => {
      const cancelar = (window as unknown as { cancelIdleCallback?: (i: number) => void }).cancelIdleCallback;
      if (ocioso && cancelar) cancelar(id);
      else window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez; `carregar` só age se ainda não carregou
  }, []);

  // A lista de esgotados só baixa quando o cliente começa a digitar (arquivo de ~30 KB comprimido).
  useEffect(() => {
    if (normal.length < 2 || esgotados !== null || carregandoEsgotados.current) return;
    carregandoEsgotados.current = true;
    fetch("/dados/nacoes/esgotados-busca.json", { headers: { accept: "application/json" } })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: Sugestao[] | null) => setEsgotados(Array.isArray(dados) ? dados : []))
      .catch(() => setEsgotados([]));
  }, [normal, esgotados]);

  // Na página de produtos, a caixa já abre com o termo buscado (?q=fralda).
  useEffect(() => {
    if (window.location.pathname.startsWith("/nacoes-unidas/produtos") || window.location.pathname.startsWith("/departamentos")) {
      const q = new URLSearchParams(window.location.search).get("q");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- a página é estática: o termo só existe na barra de endereço, depois que a página abre
      if (q) setTermo(q.slice(0, 80));
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- só o navegador sabe se tem reconhecimento de fala
  useEffect(() => setVozDisponivel(criarReconhecimento(window) !== null), []);
  useEffect(() => () => reconhecimento.current?.abort(), []);
  function falar() {
    if (ouvindo) {
      reconhecimento.current?.stop();
      return;
    }
    const r = criarReconhecimento(window);
    if (!r) return;
    reconhecimento.current = r;
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    setAvisoVoz("");
    r.onresult = (evento) => {
      const partes = Array.from(evento.results, (resultado) => resultado[0]?.transcript ?? "");
      const texto = limparFala(partes.join(" "));
      if (texto) setTermo(texto);
    };
    r.onerror = (evento) => setAvisoVoz(mensagemDeErroDeFala(evento.error));
    r.onend = () => {
      setOuvindo(false);
      setFoco(true);
    };
    setOuvindo(true);
    try {
      r.start();
    } catch {
      setOuvindo(false);
    }
  }

  // Exemplos que mudam no campo de busca vazio, a cada 3,5 s; param ao focar, ao digitar e para quem prefere menos movimento.
  const campoVazio = termo === "" && !foco;
  useEffect(() => {
    if (!campoVazio) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setExemplo((atual) => (atual + 1) % EXEMPLOS_BUSCA.length);
    }, 3500);
    return () => window.clearInterval(id);
  }, [campoVazio]);

  // Abre a gaveta "Departamentos" pelo botão do cabeçalho do desktop.
  useEffect(() => {
    const abrir = () => setMenu(true);
    window.addEventListener(EVENTO_ABRIR_DEPARTAMENTOS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_DEPARTAMENTOS, abrir);
  }, []);

  return (
    <>
      <header className="shop-header">
        <SubmenuHome />
        <button type="button" className="shop-icone shop-menu" aria-label="Abrir menu" aria-expanded={menu} aria-controls="shop-menu-painel" onClick={() => setMenu(true)}>
          <IconMenu size={26} />
        </button>
        <a className="shop-marca" href="/" aria-label="União Farma Drogaria e Perfumaria: página inicial">
          <MarcaUniao />
        </a>
        <form
          ref={formRef}
          className="shop-busca"
          role="search"
          action="/nacoes-unidas/produtos"
          method="get"
          onSubmit={() => lembrarBusca(termo)}
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
            // Dá tempo do toque virar clique; só fecha se o foco realmente saiu da busca e ninguém está tocando no painel.
            window.setTimeout(() => {
              if (tocandoPainel.current || formRef.current?.contains(document.activeElement)) return;
              setFoco(false);
            }, 200);
          }}
        >
          <label className="sr-only" htmlFor="shop-busca-q">Buscar produto</label>
          <input
            id="shop-busca-q"
            name="q"
            type="search"
            data-clarity-mask="true"
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
            placeholder={exemplo < 0 ? "Buscar na União Farma" : `Buscar “${EXEMPLOS_BUSCA[exemplo]}”`}
            autoComplete="off"
            enterKeyHint="search"
          />
          {vozDisponivel ? (
            <button type="button" className={`shop-busca-voz${ouvindo ? " is-ouvindo" : ""}`} aria-label="Buscar falando" aria-pressed={ouvindo} onClick={falar}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </button>
          ) : null}
          <button type="submit" aria-label="Buscar">
            {/* Lupa de contorno, sem o preenchimento claro do ícone padrão; traço de 2 px (10 em 256) e 24 px, metade da área de toque de 48 px. */}
            <svg width="24" height="24" viewBox="0 0 256 256" fill="currentColor" stroke="currentColor" strokeWidth="10" strokeLinejoin="round" aria-hidden="true">
              <path d="M229.66,218.34,179.6,168.28a88.21,88.21,0,1,0-11.32,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
            </svg>
          </button>
          <p className="sr-only" role="status" aria-live="polite">{ouvindo ? "Ouvindo. Fale o nome do produto." : avisoVoz}</p>
          {avisoVoz && !ouvindo ? <p className="shop-busca-aviso" aria-hidden="true">{avisoVoz}</p> : null}
          {mostrarPainel ? (
            <div
              className="shop-sugestoes"
              id="shop-sugestoes"
              ref={painelRef}
              onKeyDown={(event) => {
                // Teclado no painel de sugestões: setas andam entre os links e botões; Esc fecha e devolve o foco ao campo de busca.
                const campo = document.getElementById("shop-busca-q") as HTMLInputElement | null;
                if (event.key === "Escape") {
                  event.preventDefault();
                  campo?.focus(); // o foco no campo reabre o painel (onFocus); por isso o fechamento vem depois
                  setFoco(false);
                  return;
                }
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                const itens = [...(painelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? [])];
                const i = itens.indexOf(document.activeElement as HTMLElement);
                if (i < 0) return;
                event.preventDefault();
                if (event.key === "ArrowDown") itens[Math.min(i + 1, itens.length - 1)]?.focus();
                else if (i === 0) campo?.focus();
                else itens[i - 1]?.focus();
              }}
              onClick={(event) => {
                // Abrir um produto ou "ver todos" a partir do que foi digitado, ou repetir uma busca recente, guarda a busca.
                const link = (event.target as HTMLElement).closest("a");
                if (!link) return;
                const repetida = link.getAttribute("data-busca");
                const texto = repetida ?? (normal.length >= 2 ? termo : "");
                if (texto) lembrarBusca(texto);
              }}
              onPointerDown={() => {
                tocandoPainel.current = true;
                window.clearTimeout(fimToque.current);
              }}
              onPointerUp={() => {
                window.clearTimeout(fimToque.current);
                fimToque.current = window.setTimeout(() => { tocandoPainel.current = false; }, 600);
              }}
              onPointerCancel={() => {
                tocandoPainel.current = false;
              }}
            >
              {atalhos.length > 0 ? (
                <nav className="shop-sugestoes-atalhos" aria-label="Ir direto">
                  {atalhos.map((atalho) => (
                    <a key={`${atalho.tipo}-${atalho.nome}`} href={atalho.href}>
                      <small>{atalho.tipo === "marca" ? "Marca" : "Departamento"}</small>
                      <strong>{atalho.nome}</strong>
                      <span aria-hidden="true">›</span>
                    </a>
                  ))}
                </nav>
              ) : null}
              {normal.length === 0 ? (
                <>
                  <div className="shop-sugestoes-receita">
                    <BotaoReceita aoAbrir={() => setFoco(false)} classe="receita-gatilho-bloco" rotulo="Tenho uma receita: ler a foto" />
                  </div>
                  {recentes.length > 0 ? (
                    <>
                      <div className="shop-sugestoes-cabeca">
                        <p className="shop-sugestoes-titulo" id="buscas-recentes-titulo">Buscas recentes</p>
                        <button type="button" className="shop-sugestoes-limpar" onClick={() => esquecerBusca(null)}>Limpar</button>
                      </div>
                      <ul className="shop-sugestoes-recentes" aria-labelledby="buscas-recentes-titulo">
                        {recentes.map((busca) => (
                          <li key={busca} className="shop-recente">
                            <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(busca)}`} data-busca={busca}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                              <span>{busca}</span>
                            </a>
                            <button type="button" aria-label={`Remover a busca ${busca}`} onClick={() => esquecerBusca(busca)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                  <p className="shop-sugestoes-titulo" id="termos-mais-buscados-titulo">Termos mais buscados</p>
                  <ul className="shop-sugestoes-termos" role="listbox" aria-labelledby="termos-mais-buscados-titulo">
                    {BUSCAS_POPULARES.map((valor, i) => (
                      <li key={valor} role="option">
                        <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(valor)}`}>
                          <strong aria-hidden="true">{ORDINAIS[i]}</strong>
                          <span>{valor}</span>
                        </a>
                        </li>
                    ))}
                  </ul>
                </>
              ) : resultados.length > 0 || resultadosRestritos.length > 0 || resultadosEsgotados.length > 0 ? (
                <>
                  {corrigida ? (
                    <p className="shop-sugestoes-corrigida" role="status">
                      Mostrando resultados para: <strong>{corrigida}</strong>
                    </p>
                  ) : null}
                  <ul aria-label="Produtos sugeridos">
                    {resultados.map((item) => (
                      <li key={item.slug} style={{position:"relative"}}>
                        <a href={`/nacoes-unidas/produtos/${item.slug}`}>
                          {item.foto ? <img src={item.foto} alt="" width="44" height="44" /> : <SemFoto className="shop-sug-sem-foto" />}
                          <span><NomeDestacado nome={item.nome} termos={termosDestaque} /></span>
                          <strong>{formatarCentavos(item.precoCentavos)}</strong>
                        </a>
                          <div style={{position:"absolute",right:"0.5rem",top:"50%",transform:"translateY(-50%)"}}>
                            <SalvarNaLista nome={item.nome} slug={item.slug} />
                          </div>
                        </li>
                    ))}
                    {resultadosRestritos.map((item) => (
                      <li key={`${item.tipo}-${item.nome}`}>
                        <a href={`/nacoes-unidas/produtos/${slugDoRestrito(item)}`}>
                          <img src={imagemIlustrativa({ ...item, nome: item.nomeOriginal })} alt="" width="44" height="44" />
                          <span>
                            <NomeDestacado nome={item.nome} termos={termosDestaque} />
                          </span>
                          <strong>{item.precoCentavos === null ? (item.semVenda ? <small className="shop-sug-consulte">Consulte o farmacêutico</small> : "") : formatarCentavos(item.precoCentavos)}</strong>
                        </a>
                          <div style={{position:"absolute",right:"0.5rem",top:"50%",transform:"translateY(-50%)"}}>
                            <SalvarNaLista nome={item.nome} slug={slugDoRestrito(item)} />
                          </div>
                        </li>
                    ))}
                    {resultadosEsgotados.map((item) => (
                      <li key={`esgotado-${item.slug}`} className="shop-sug-esgotado">
                        <a href={`/nacoes-unidas/produtos/${item.slug}`}>
                          {item.foto ? <img src={item.foto} alt="" width="44" height="44" /> : <SemFoto className="shop-sug-sem-foto" />}
                          <span><NomeDestacado nome={item.nome} termos={termosDestaque} /></span>
                          <em>Esgotado</em>
                        </a>
                          <div style={{position:"absolute",right:"0.5rem",top:"50%",transform:"translateY(-50%)"}}>
                            <SalvarNaLista nome={item.nome} slug={item.slug} />
                          </div>
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
                  {sugerida ? (
                    <p>Você quis dizer <a href={`/nacoes-unidas/produtos?q=${encodeURIComponent(sugerida)}`}><strong>{sugerida}</strong></a>?</p>
                  ) : (
                    <p>Confira a digitação, use termos mais amplos ou navegue pelas categorias.</p>
                  )}
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
          <span className="shop-busca-orbita" aria-hidden="true" />
        </form>
        <nav className="shop-links" aria-label="Menu principal">
          {LINKS.slice(0, 4).map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </nav>
        {nacoes && pedidoPeloWhats ? (
          <a
            className="shop-whats"
            href={buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Quero fazer um pedido.", { campaign: "cabecalho", content: "cabecalho_nacoes" })}
            target="_blank"
            rel="noreferrer"
            aria-label="Pedir no WhatsApp da loja Nações Unidas"
            data-track-event="whatsapp_click"
            data-track-unit="nacoes"
            data-track-source="cabecalho"
          >
            <LogoWhatsApp size={24} />
            <span>Pedir no WhatsApp</span>
          </a>
        ) : null}
        <div className="shop-acoes">
          <a className="shop-receita" href="/receita" aria-label="Enviar receita" data-track-event="receita_cabecalho">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 17v-5M9.5 14.5h5" /></svg>
            <span>Receita</span>
          </a>
          <ReservaSacola />
          <FotosNovas />
        </div>
        <div className="shop-linha2">
          <EntregarEm cabecalho />
          <nav className="shop-linha2-menu" aria-label="Seções do site">
            <button type="button" className="shop-linha2-dep" aria-haspopup="dialog" aria-expanded={menu} aria-controls="shop-menu-painel" onClick={() => setMenu(true)}>
              Departamentos
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4.5l4 4 4-4" /></svg>
            </button>
            {LINKS_LINHA2.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
          {statusLoja ? (
            <p className={`shop-linha2-status${statusLoja.isOpen ? " is-aberta" : ""}`} title={statusLoja.label}>
              <span className="shop-faixa-ponto" aria-hidden="true" />
              {statusLoja.label}
            </p>
          ) : null}
        </div>
      </header>

      <DepartamentosGaveta aberto={menu} onFechar={() => setMenu(false)} />
      <LojaPicker />
    </>
  );
}
