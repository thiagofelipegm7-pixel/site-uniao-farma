"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidatosDoArraste } from "../fotos-arrastar";
import { CATEGORIAS_VALIDAS } from "../categoria-override";
import { chaveDoNome } from "../nomes-corrigidos";
import { nomeDeExibicao } from "../nome-exibicao";
import { prepararFoto } from "./preparar-foto";
import PainelCatalogo from "./PainelCatalogo";
import { filtrarLinhas, resumirFotos, type FiltroFotos, type LinhaFoto, type Reconciliacao, type ResumoFotos } from "../fotos-painel";
import "../metrics-polish.css";
import "./painel-fotos.css";

type Linha = [string, string, string, string, number, number, number, number, number, string, number, number?, number?];
type LinhaPainel = LinhaFoto & { sistemaRestrito?: boolean };
type Resposta = { ok: boolean; erro?: string; geradoEm: string | null; resumo: ResumoFotos; reconciliacao?: Reconciliacao; categorias: string[]; pendentes?: string[]; removidas?: string[]; publicacaoRapida?: boolean; nomes?: Record<string, { nome: string; por: string; quando: string }>; controlados?: Record<string, { estado: "sim" | "nao"; por: string; quando: string }>; categoriasOverride?: Record<string, { categoria: string; por: string; quando: string }>; alteracoes?: { tipo: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string; quando: string }[]; linhas: Linha[] };

const CHAVE_MARCAS = "uf_fotos_ok";
const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const POR_PAGINA = 100;

function paraLinha(l: Linha): LinhaPainel {
  return { ean: l[0], nome: l[1], lab: l[2], classe: l[3], estoque: l[4], preco: l[5], valor: l[6], controlado: l[7] === 1, antimicrobiano: l[8] === 1, categoria: l[9], noSite: l[10] === 1, ...(l[11] === 1 ? { semCodigo: true } : {}), ...(l[12] === 1 ? { sistemaRestrito: true } : {}) };
}

/** Arquivo do computador ou imagem arrastada de outro site (o navegador só manda o endereço e o HTML dela). */
function arrastoDeImagem(dt: DataTransfer): boolean {
  return dt.types.includes("Files") || dt.types.includes("text/uri-list") || dt.types.includes("text/html");
}

function origemDoArraste(dt: DataTransfer): File | string[] | undefined {
  const arquivo = [...(dt.files ?? [])].find((f) => f.type.startsWith("image/"));
  if (arquivo) return arquivo;
  const enderecos = candidatosDoArraste({ uriList: dt.getData("text/uri-list"), html: dt.getData("text/html"), texto: dt.getData("text/plain") });
  return enderecos.length > 0 ? enderecos : undefined;
}

type Envio = "enviando" | "enviada" | "erro";

type Ordem = "nome" | "estoque" | "categoria";

/** Mostra como as contagens fecham: o que o PC tem, o que o site lista e o que este painel conta. */
function ContasFecham({ c }: { c: Reconciliacao }) {
  const pt = (n: number) => n.toLocaleString("pt-BR");
  const diferenca = c.listadosNoSite !== null ? c.noSite - c.listadosNoSite : 0;
  return (
    <details className="pf-contas">
      <summary>Por que {pt(c.pc)} no PC, {pt(c.listadosNoSite ?? c.noSite)} no site e {pt(c.aVendaNoPainel)} aqui?</summary>
      <ul>
        <li><b>{pt(c.pc)}</b> linhas no PC.</li>
        <li>− <b>{pt(c.servicos)}</b> serviços (taxa de entrega, aferição, xerox, manipulação): não são produto.</li>
        <li>− <b>{pt(c.semPreco)}</b> sem preço de venda no PC: não vão ao site até ganharem preço.</li>
        <li>− <b>{pt(c.repetidos)}</b> repetidos (mesmo nome, laboratório e preço): o site mostra um só.</li>
        <li>= <b>{pt(c.noSite)}</b> produtos no site{c.listadosNoSite !== null ? <> (a lista do site mostra <b>{pt(c.listadosNoSite)}</b>{diferenca !== 0 ? `, diferença de ${pt(Math.abs(diferenca))} por regras de nome e laboratório` : ""})</> : null}.</li>
        <li>Este painel conta <b>{pt(c.noPainel)}</b> linhas: tira {pt(c.bijuterias)} bijuterias e junta {pt(c.codigosRepetidos)} itens que repetem o código de barras (a foto é guardada por código). Dessas, {pt(c.semPrecoNoPainel)} estão sem preço no PC e ficam em &ldquo;Fora do site&rdquo;. Sobram <b>{pt(c.aVendaNoPainel)}</b> &ldquo;à venda no site&rdquo;.</li>
      </ul>
    </details>
  );
}

export default function PainelFotos() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estoque, setEstoque] = useState<FiltroFotos["estoque"]>("com");
  const [fotos, setFotos] = useState<FiltroFotos["fotos"]>("faltam");
  const [tipo, setTipo] = useState<FiltroFotos["tipo"]>("");
  const [ordem, setOrdem] = useState<Ordem>("estoque");
  const [pagina, setPagina] = useState(1);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [envios, setEnvios] = useState<Record<string, Envio>>({});
  // Linha sobre a qual o arquivo está sendo arrastado (computador).
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [configAberto, setConfigAberto] = useState(false);
  const [produtoConfig, setProdutoConfig] = useState<string | null>(null);
  // Quem está mexendo: fica registrado no histórico (foto e nome). Guardado só neste aparelho.
  const [por, setPor] = useState("");
  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [textoNome, setTextoNome] = useState("");
  const [nomesAgora, setNomesAgora] = useState<Record<string, string | null>>({});
  const [controladosAgora, setControladosAgora] = useState<Record<string, "auto" | "sim" | "nao">>({});
  const [categoriasAgora, setCategoriasAgora] = useState<Record<string, string>>({});
  const [removidasAgora, setRemovidasAgora] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState<string | null>(null);
  // Linha escolhida com um toque: recebe a imagem colada (Ctrl+V).
  const [alvoColar, setAlvoColar] = useState<string | null>(null);
  const colarRef = useRef<(dt: DataTransfer) => void>(() => undefined);
  const soltarRef = useRef<(ean: string | null, dt: DataTransfer) => void>(() => undefined);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch("/api/interno/fotos", { cache: "no-store" });
      // Sessão vencida: o servidor responde com a tela de entrada (HTML). Leva para entrar de novo e volta para cá.
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        window.location.assign("/interno/entrar?next=%2Finterno%2Ffotos");
        return;
      }
      const j = (await r.json()) as Resposta;
      if (!r.ok || !j.ok) throw new Error("falha");
      setDados(j);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- carga inicial do painel e das marcações guardadas neste navegador */
    void carregar();
    // Vindo da tela inicial (?q=nome ou código): já abre buscando, entre todos os produtos.
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setBusca(q.slice(0, 80));
      setFotos("");
      setEstoque("");
    }
    try {
      setPor(window.localStorage.getItem("uf_revisao_nome") ?? "");
    } catch {
      // sem armazenamento
    }
    try {
      const salvo = JSON.parse(window.localStorage.getItem(CHAVE_MARCAS) || "[]");
      if (Array.isArray(salvo)) setMarcados(new Set(salvo.filter((x): x is string => typeof x === "string")));
    } catch {
      // sem armazenamento: as marcações só não ficam guardadas
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [carregar]);

  useEffect(() => {
    // Ouve o arraste na página inteira, já na fase de captura: assim o navegador nunca abre a imagem (nem sai do painel),
    // seja qual for o elemento sob o mouse. A linha do produto é achada pelo ponto onde o arquivo foi solto.
    const linhaDe = (alvo: EventTarget | null) => (alvo instanceof Element ? (alvo.closest<HTMLElement>("tr[data-ean]")?.dataset.ean ?? null) : null);
    const sobre = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      setArrastando(linhaDe(e.target));
    };
    const saiu = (e: DragEvent) => {
      if (!e.relatedTarget) setArrastando(null);
    };
    const solta = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setArrastando(null);
      if (e.dataTransfer) soltarRef.current(linhaDe(e.target), e.dataTransfer);
    };
    window.addEventListener("dragover", sobre, true);
    window.addEventListener("dragleave", saiu, true);
    window.addEventListener("drop", solta, true);
    const cola = (e: ClipboardEvent) => {
      if (!e.clipboardData || (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))) return;
      e.preventDefault();
      colarRef.current(e.clipboardData);
    };
    window.addEventListener("paste", cola);
    return () => {
      window.removeEventListener("paste", cola);
      window.removeEventListener("dragover", sobre, true);
      window.removeEventListener("dragleave", saiu, true);
      window.removeEventListener("drop", solta, true);
    };
  }, []);

  const pendentes = useMemo(() => new Set(dados?.pendentes ?? []), [dados]);
  // Fotos já publicadas no site (arquivo fixo). As enviadas e ainda não publicadas já aparecem na loja, então contam como "com foto".
  const publicadas = useMemo(() => new Set((dados?.linhas ?? []).filter((l) => l[10] === 1).map((l) => l[0])), [dados]);
  // Voltou para a aba (ou o iPhone restaurou a página): atualiza a lista, que mudou enquanto estava fora (fotos publicadas, estoque).
  useEffect(() => {
    let ultimo = Date.now();
    const atualizar = () => {
      if (Date.now() - ultimo < 30_000) return;
      ultimo = Date.now();
      void carregar();
    };
    const visivel = () => {
      if (document.visibilityState === "visible") atualizar();
    };
    document.addEventListener("visibilitychange", visivel);
    window.addEventListener("pageshow", atualizar);
    return () => {
      document.removeEventListener("visibilitychange", visivel);
      window.removeEventListener("pageshow", atualizar);
    };
  }, [carregar]);

  const linhas = useMemo(() => {
    const feitas = new Set([...pendentes, ...Object.entries(envios).filter(([, v]) => v === "enviada").map(([k]) => k)]);
    // Foto tirada pelo painel e ainda não removida do arquivo do site: já não vale (volta a "falta foto"), a não ser que tenha mandado outra depois.
    const tiradas = new Set([...(dados?.removidas ?? []), ...removidasAgora]);
    return (dados ? dados.linhas.map(paraLinha) : []).map((l) => {
      if (feitas.has(l.ean)) return { ...l, noSite: true };
      return tiradas.has(l.ean) ? { ...l, noSite: false } : l;
    });
  }, [dados, pendentes, envios, removidasAgora]);
  const resumo = useMemo(() => resumirFotos(linhas), [linhas]);
  const filtradas = useMemo(() => {
    // Buscando por nome ou código: mostra o produto mesmo que já tenha foto (para trocar).
    const lista = filtrarLinhas(linhas, { busca, categoria, estoque, fotos: busca.trim() ? "" : fotos, tipo, marcados });
    const comparar: Record<Ordem, (a: LinhaFoto, b: LinhaFoto) => number> = {
      estoque: (a, b) => b.estoque - a.estoque,
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      categoria: (a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || b.estoque - a.estoque,
    };
    return [...lista].sort(comparar[ordem]);
  }, [linhas, busca, categoria, estoque, fotos, tipo, marcados, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  function marcar(ean: string, ligado: boolean) {
    setMarcados((antes) => {
      const novo = new Set(antes);
      if (ligado) novo.add(ean);
      else novo.delete(ean);
      try {
        window.localStorage.setItem(CHAVE_MARCAS, JSON.stringify([...novo]));
      } catch {
        // sem armazenamento
      }
      return novo;
    });
  }

  /** Imagem arrastada de outro site: tenta cada endereço (data: aqui mesmo; https pelo servidor) até um abrir. */
  async function imagemDaWeb(enderecos: string[]): Promise<Blob | null> {
    for (const url of enderecos) {
      try {
        if (url.startsWith("data:")) {
          const [cab, dados] = url.split(",");
          const bytes = Uint8Array.from(atob(dados), (c) => c.charCodeAt(0));
          return new Blob([bytes], { type: cab.slice(5).split(";")[0] });
        }
        const r = await fetch("/api/interno/fotos/baixar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }), signal: AbortSignal.timeout(20_000) });
        if (r.ok) return await r.blob();
      } catch {
        // tenta o próximo endereço
      }
    }
    return null;
  }

  async function enviarFoto(l: LinhaFoto, origem: File | Blob | string[] | undefined) {
    if (!origem) return;
    setEnvios((e) => ({ ...e, [l.ean]: "enviando" }));
    let etapa = "origem";
    try {
      const arquivo = Array.isArray(origem) ? await imagemDaWeb(origem) : origem;
      if (!arquivo || (arquivo.type && !arquivo.type.startsWith("image/"))) throw new Error("origem");
      etapa = "preparar";
      const imagem = await prepararFoto(arquivo);
      etapa = "envio";
      const r = await fetch("/api/interno/fotos/enviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ean: l.ean, nome: l.nome, imagem, por: por.trim() }), signal: AbortSignal.timeout(45_000) });
      // Sessão vencida: o servidor manda para a tela de entrada (HTML) em vez de responder o envio.
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        etapa = "sessao";
        throw new Error("sessao");
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        etapa = j?.erro ?? `http_${r.status}`;
        throw new Error("envio");
      }
      setEnvios((e) => ({ ...e, [l.ean]: "enviada" }));
      setAviso("");
    } catch (erro) {
      setEnvios((e) => ({ ...e, [l.ean]: "erro" }));
      if (etapa === "envio" && erro instanceof Error && (erro.name === "TimeoutError" || erro.name === "TypeError")) etapa = "TimeoutError"; // sem rede ou lento demais
      const motivo: Record<string, string> = {
        origem: Array.isArray(origem) ? "Não consegui baixar essa imagem do site (alguns sites bloqueiam). Salve a imagem no computador e arraste o arquivo, ou use \"Enviar foto\"." : "Esse arquivo não parece ser uma imagem. Use JPG, PNG ou WebP.",
        preparar: "O navegador não conseguiu abrir essa imagem. Salve de novo como JPG ou PNG e tente outra vez.",
        sessao: "Sua sessão no painel venceu. Recarregue a página (F5), entre de novo e envie a foto outra vez.",
        imagem_invalida: "A imagem ficou grande demais para enviar. Tente uma foto menor.",
        formato_invalido: "Formato de imagem não aceito. Use JPG, PNG ou WebP.",
        sem_banco: "O banco do site não respondeu. Tente de novo em instantes.",
        TimeoutError: "A conexão está lenta ou caiu. Confira a internet e tente de novo.",
      };
      setAviso(motivo[etapa] ?? `Não consegui enviar a foto (${etapa}). Tente de novo; se repetir, me avise com esse código.`);
    }
  }

  useEffect(() => {
    soltarRef.current = (ean, dt) => {
      if (!ean) {
        setAviso("Solte a imagem em cima da linha do produto que falta foto.");
        return;
      }
      const l = linhas.find((x) => x.ean === ean);
      if (!l) return;
      const origem = origemDoArraste(dt);
      if (!origem) {
        setAviso(`Não consegui ler essa imagem (o navegador mandou: ${[...dt.types].join(", ") || "nada"}). Salve a imagem no computador e arraste o arquivo, ou use "Enviar foto".`);
        return;
      }
      setAviso(dt.files && [...dt.files].filter((f) => f.type.startsWith("image/")).length > 1 ? "Você soltou mais de uma foto: enviei só a primeira. Solte uma foto por produto." : "");
      void enviarFoto(l, origem);
    };
  });

  useEffect(() => {
    colarRef.current = (dt) => {
      const l = alvoColar ? linhas.find((x) => x.ean === alvoColar) : undefined;
      if (!l) {
        setAviso("Para colar, toque primeiro na linha do produto e depois use Ctrl+V.");
        return;
      }
      const origem = origemDoArraste(dt);
      if (!origem) {
        setAviso("Não achei imagem para colar. Clique com o botão direito na imagem, escolha \"Copiar imagem\" e cole aqui com Ctrl+V.");
        return;
      }
      setAviso("");
      void enviarFoto(l, origem);
    };
  });

  async function removerFoto(l: LinhaFoto) {
    if (!window.confirm(`Tirar a foto de "${l.nome}"? A loja volta a mostrar a imagem neutra.`)) return;
    try {
      const r = await fetch("/api/interno/fotos/remover", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ean: l.ean, nome: l.nome, por: por.trim() }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;
      if (!r.ok || !j?.ok) throw new Error("remover");
      setRemovidasAgora((antes) => new Set(antes).add(l.ean));
      setEnvios((e) => {
        const novo = { ...e };
        delete novo[l.ean];
        return novo;
      });
      setAviso("");
    } catch {
      setAviso("Não consegui tirar a foto agora. Tente de novo.");
    }
  }

  function guardarPor(v: string) {
    setPor(v);
    try {
      window.localStorage.setItem("uf_revisao_nome", v);
    } catch {
      // sem armazenamento
    }
  }

  /** Nome que o cliente lê hoje: o corrigido no painel (se houver) ou o automático. */
  function nomeAtual(l: LinhaFoto): { texto: string; corrigido: boolean } {
    const k = chaveDoNome(l.nome);
    const local = nomesAgora[k];
    if (local !== undefined) return local ? { texto: local, corrigido: true } : { texto: nomeDeExibicao(l.nome), corrigido: false };
    const salvo = dados?.nomes?.[k];
    return salvo ? { texto: salvo.nome, corrigido: true } : { texto: nomeDeExibicao(l.nome), corrigido: false };
  }

  async function salvarNome(l: LinhaFoto, voltar = false, texto?: string) {
    try {
      const r = await fetch(voltar ? "/api/interno/produto/nome/desfazer" : "/api/interno/produto/nome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original: l.nome, nome: texto ?? textoNome, por: por.trim() }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        const msg: Record<string, string> = { tamanho: "O nome precisa ter de 3 a 120 letras.", tudo_maiusculo: "Escreva do jeito que o cliente fala (não use só letras maiúsculas).", caracteres: "Tire os sinais < e > do nome." };
        setAviso(msg[j?.erro ?? ""] ?? "Não consegui salvar o nome agora. Tente de novo.");
        return;
      }
      setNomesAgora((n) => ({ ...n, [chaveDoNome(l.nome)]: voltar ? null : textoNome.replace(/\s+/g, " ").trim() }));
      setEditandoNome(null);
      setAviso(voltar ? "Voltou ao nome automático. Vale na próxima publicação (em alguns minutos)." : "Nome salvo no histórico. Vale na próxima publicação (em alguns minutos).");
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    }
  }


  function categoriaEfetiva(l: LinhaPainel): string {
    const k = chaveDoNome(l.nome);
    if (categoriasAgora[k]) return categoriasAgora[k];
    const salvo = dados?.categoriasOverride?.[k];
    return salvo?.categoria ?? l.categoria;
  }

  function estadoCategoria(l: LinhaPainel): string {
    const k = chaveDoNome(l.nome);
    if (Object.prototype.hasOwnProperty.call(categoriasAgora, k)) return categoriasAgora[k] === "" ? "auto" : categoriasAgora[k];
    return dados?.categoriasOverride?.[k]?.categoria ? dados.categoriasOverride[k].categoria : "auto";
  }

  function estadoControlado(l: LinhaPainel): "auto" | "sim" | "nao" {
    const k = chaveDoNome(l.nome);
    if (controladosAgora[k]) return controladosAgora[k];
    const salvo = dados?.controlados?.[k];
    return salvo?.estado ?? "auto";
  }

  async function salvarControlado(l: LinhaPainel, estado: "auto" | "sim" | "nao") {
    try {
      const r = await fetch("/api/interno/produto/controlado", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original: l.nome, estado, por: por.trim() }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        setAviso(j?.erro === "so_medicamentos" ? "Só dá para marcar controlado em produtos da categoria Medicamentos." : "Não consegui salvar o enquadramento controlado. Tente de novo.");
        return;
      }
      setControladosAgora((n) => ({ ...n, [chaveDoNome(l.nome)]: estado }));
      const rotulo = estado === "auto" ? "automático" : estado === "sim" ? "controlado" : "não controlado";
      setAviso(`Enquadramento (${rotulo}) salvo. Vale na próxima publicação (em alguns minutos).`);
    } catch {
      setAviso("Não consegui salvar o enquadramento controlado. Tente de novo.");
    }
  }

  async function salvarCategoria(l: LinhaPainel, categoria: string) {
    if (categoria !== "auto" && categoria !== "Medicamentos" && l.sistemaRestrito) {
      setAviso("Este item é receita ou controlado no sistema (Portaria 344). Não pode sair de Medicamentos.");
      return;
    }
    try {
      const r = await fetch("/api/interno/produto/categoria", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original: l.nome, categoria, por: por.trim() }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        const msg: Record<string, string> = {
          sistema_restrito: "Este item é receita ou controlado no sistema (Portaria 344). Não pode sair de Medicamentos.",
          categoria_invalida: "Categoria inválida.",
        };
        setAviso(msg[j?.erro ?? ""] ?? "Não consegui salvar a categoria. Tente de novo.");
        return;
      }
      const k = chaveDoNome(l.nome);
      setCategoriasAgora((n) => ({ ...n, [k]: categoria === "auto" ? "" : categoria }));
      if (categoria !== "auto" && categoria !== "Medicamentos") {
        setControladosAgora((n) => ({ ...n, [k]: "auto" }));
      }
      setAviso(categoria === "auto" ? "Categoria automática. Vale na próxima publicação (em alguns minutos)." : `Categoria “${categoria}” salva. Vale na próxima publicação (em alguns minutos).`);
    } catch {
      setAviso("Não consegui salvar a categoria. Tente de novo.");
    }
  }

  async function copiarCodigo(ean: string) {
    try {
      await navigator.clipboard.writeText(ean);
    } catch {
      // Sem permissão da área de transferência: seleciona num campo temporário e copia.
      const campo = document.createElement("textarea");
      campo.value = ean;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      document.execCommand("copy");
      campo.remove();
    }
    setCopiado(ean);
    window.setTimeout(() => setCopiado((atual) => (atual === ean ? null : atual)), 1500);
  }

  const mudar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPagina(1);
  };

  return (
    <>
    <section className="painel-fotos">
      <h1>Produtos</h1>
      <PainelCatalogo />
      {erro ? <p role="alert">Não consegui ler o estoque agora. O PC da loja ou o acesso aos dados pode estar parado. <button type="button" onClick={() => void carregar()}>Tentar de novo</button></p> : null}
      {!dados && !erro ? <p>Carregando o estoque…</p> : null}
      {dados ? (
        <>
          
          {dados.reconciliacao ? <ContasFecham c={dados.reconciliacao} /> : null}
          

          {dados.publicacaoRapida === false ? (
            <p className="pf-aviso" role="note">A publicação rápida está desligada (falta a chave do GitHub no Cloudflare). As fotos funcionam no site, mas o arquivo fixo só sai quando o GitHub rodar a sincronização, o que pode levar horas.</p>
          ) : null}
          {arrastando ? <p className="pf-solte" role="status">Solte aqui para enviar a foto de &ldquo;{linhas.find((x) => x.ean === arrastando)?.nome}&rdquo;</p> : null}
          {aviso ? <p className="pf-aviso" role="status">{aviso}</p> : null}

                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <input type="search" value={busca} onChange={(e) => mudar(setBusca)(e.target.value)} placeholder="Buscar produto, laboratório ou código" aria-label="Buscar" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #d3e2df", fontSize: "0.9rem", flex: "1", minWidth: "200px" }} />
            <select value={categoria} onChange={(e) => mudar(setCategoria)(e.target.value)} aria-label="Categoria" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #d3e2df", fontSize: "0.9rem" }}>
              <option value="">Todas as categorias</option>
              <option value="__corrigir">A corrigir</option>
              {dados.categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={fotos} onChange={(e) => mudar(setFotos)(e.target.value as FiltroFotos["fotos"])} aria-label="Fotos" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #d3e2df", fontSize: "0.9rem" }}>
              <option value="faltam">Faltam foto</option>
              <option value="site">Já estão no site</option>
              <option value="">Todos</option>
            </select>
            <select value={estoque} onChange={(e) => mudar(setEstoque)(e.target.value as FiltroFotos["estoque"])} aria-label="Estoque" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid #d3e2df", fontSize: "0.9rem" }}>
              <option value="com">Só com estoque</option>
              <option value="zero">Zerado ou negativo</option>
              <option value="">Todo estoque</option>
            </select>
          </div>
          <p className="pf-contagem" role="status">{filtradas.length} {filtradas.length === 1 ? "item" : "itens"} no filtro</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1.5rem", justifyContent: "center" }}>
            {visiveis.map((l) => (
              <div
                key={l.ean}
                data-ean={l.ean}
                tabIndex={0}
                onFocus={() => setAlvoColar(l.ean)}
                style={{ background: "#fff", borderRadius: "12px", padding: "0.75rem", border: "1px solid #d3e2df", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "relative", width: "100%", height: "200px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
              >
                {l.controlado || l.sistemaRestrito ? <span style={{ position: "absolute", top: "0.5rem", left: "0.5rem", width: "10px", height: "10px", background: "#e53935", borderRadius: "50%", zIndex: 1 }} title="Controlado" /> : null}
                <button type="button" onClick={() => setProdutoConfig(l.ean)} aria-label="Configurar produto" style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", zIndex: 1 }}>⚙️</button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60px", flexShrink: 0 }}>
                  {l.noSite ? (
                    <img src={pendentes.has(l.ean) || envios[l.ean] === "enviada" ? `/api/foto-nova?ean=${l.ean}&v=${envios[l.ean] === "enviada" ? "n" : "p"}` : `/produtos/${l.ean}.webp`} alt="" width="50" height="50" style={{ objectFit: "contain", maxWidth: "50px", maxHeight: "50px" }} />
                  ) : (
                    <label style={{ cursor: "pointer" }}>
                      <input type="file" accept="image/*" disabled={envios[l.ean] === "enviando"} onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
                      <span style={{ background: "#0e7370", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.8rem" }}>
                        {envios[l.ean] === "enviando" ? "Enviando…" : "Enviar foto"}
                      </span>
                    </label>
                  )}
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.75rem", textAlign: "center", lineHeight: 1.2, height: "2.4em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" }} title={nomeAtual(l).texto}>
                  {nomeAtual(l).texto}
                </div>
                <div style={{ display: "grid", gap: "0.15rem", fontSize: "0.7rem", color: "#3e4b49" }}>
                  <div><span style={{ color: "#6b7c79" }}>Qtd:</span> {l.estoque}</div>
                  <div><span style={{ color: "#6b7c79" }}>Cat:</span> {categoriaEfetiva(l)}</div>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.ean}><span style={{ color: "#6b7c79" }}>Cód:</span> {l.semCodigo ? "-" : l.ean}</div>
                  <div><span style={{ color: "#6b7c79" }}>R$:</span> {REAIS.format(l.preco)}</div>
                </div>
              </div>
            ))}
          </div>
          {totalPaginas > 1 ? (
            <p className="pf-paginas">
              <button type="button" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>Anterior</button>
              <span>Página {paginaAtual} de {totalPaginas}</span>
              <button type="button" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima</button>
            </p>
          ) : null}
        </>
      ) : null}
    </section>
      {produtoConfig ? (() => {
        const l = linhas.find((x) => x.ean === produtoConfig);
        if (!l) return null;
        return (
          <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.75rem", maxWidth: "32rem", width: "92%", maxHeight: "85vh", overflow: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>{nomeAtual(l).texto}</h2>
                <button type="button" onClick={() => setProdutoConfig(null)} aria-label="Fechar" style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#6b7c79", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gap: "0.5rem" }}>
                  <span style={{ fontWeight: 600 }}>Foto</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#f8faf9", borderRadius: "12px", border: "1px solid #d3e2df" }}>
                    {l.noSite ? (
                      <img src={pendentes.has(l.ean) || envios[l.ean] === "enviada" ? `/api/foto-nova?ean=${l.ean}&v=${envios[l.ean] === "enviada" ? "n" : "p"}` : `/produtos/${l.ean}.webp`} alt="" width="80" height="80" style={{ borderRadius: "8px", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "80px", height: "80px", background: "#e8eeec", borderRadius: "8px", display: "grid", placeItems: "center", color: "#6b7c79", fontSize: "0.8rem" }}>Sem foto</div>
                    )}
                    <label style={{ flex: 1, padding: "0.75rem 1rem", background: "#0e7370", color: "#fff", borderRadius: "10px", textAlign: "center", cursor: "pointer", fontWeight: 600 }}>
                      <input type="file" accept="image/*" onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
                      {l.noSite ? "Trocar foto" : "Enviar foto"}
                    </label>
                  </div>
                </div>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <span>Nome</span>
                  <input type="text" defaultValue={nomeAtual(l).texto} onBlur={(e) => void salvarNome(l, false, e.target.value)} style={{ padding: "0.65rem 0.75rem", borderRadius: "10px", border: "1px solid #d3e2df", fontSize: "0.95rem" }} />
                </label>
                <label style={{ display: "grid", gap: "0.4rem" }}>
                  <span>Categoria</span>
                  <select value={estadoCategoria(l)} onChange={(e) => void salvarCategoria(l, e.target.value)} style={{ padding: "0.65rem 0.75rem", borderRadius: "10px", border: "1px solid #d3e2df", fontSize: "0.95rem" }}>
                    <option value="auto">Automático</option>
                    {CATEGORIAS_VALIDAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                {categoriaEfetiva(l) === "Medicamentos" ? (
                  <label style={{ display: "grid", gap: "0.4rem" }}>
                    <span>Controlado (Portaria 344)</span>
                    <input type="checkbox" checked={estadoControlado(l) === "sim"} onChange={(e) => void salvarControlado(l, e.target.checked ? "sim" : "nao")} style={{ width: "40px", height: "22px", accentColor: "#0e7370", cursor: "pointer" }} />
                  </label>
                ) : null}
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button type="button" onClick={async () => {
                  const nomeInput = document.querySelector<HTMLInputElement>('input[type="text"]');
                  const catSelect = document.querySelector<HTMLSelectElement>('select');
                  const ctrlSelect = document.querySelectorAll<HTMLSelectElement>('select')[1];
                  if (nomeInput && nomeInput.value.trim()) {
                    setTextoNome(nomeInput.value.trim());
                    await salvarNome(l);
                  }
                  if (catSelect && catSelect.value !== estadoCategoria(l)) await salvarCategoria(l, catSelect.value);
                  if (ctrlSelect && ctrlSelect.value !== estadoControlado(l)) await salvarControlado(l, ctrlSelect.value as "auto" | "sim" | "nao");
                  setProdutoConfig(null);
                }} style={{ flex: 1, padding: "0.7rem 1.25rem", background: "#0e7370", color: "#fff", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>Confirmar</button>
                <button type="button" onClick={() => setProdutoConfig(null)} style={{ padding: "0.7rem 1.25rem", background: "#f0f4f3", color: "#3e4b49", border: "none", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
}
