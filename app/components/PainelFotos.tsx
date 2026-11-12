"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidatosDoArraste } from "../fotos-arrastar";
import { CATEGORIAS_VALIDAS } from "../categoria-override";
import { chaveDoNome } from "../nomes-corrigidos";
import { nomeDeExibicao } from "../nome-exibicao";
import { prepararFoto } from "./preparar-foto";
import PainelCatalogo from "./PainelCatalogo";
import { filtrarLinhas, resumirFotos, ROTULOS_PENDENCIA, temPendencia, type Pendencia, type FiltroFotos, type LinhaFoto, type Reconciliacao, type ResumoFotos } from "../fotos-painel";
import "../metrics-polish.css";
import "./painel-fotos.css";

type Linha = [string, string, string, string, number, number, number, number, number, string, number, number?, number?];
type LinhaPainel = LinhaFoto & { sistemaRestrito?: boolean };
type Resposta = { ok: boolean; erro?: string; geradoEm: string | null; resumo: ResumoFotos; reconciliacao?: Reconciliacao; categorias: string[]; pendentes?: string[]; removidas?: string[]; publicacaoRapida?: boolean; nomes?: Record<string, { nome: string; por: string; quando: string }>; controlados?: Record<string, { estado: "sim" | "nao"; por: string; quando: string }>; categoriasOverride?: Record<string, { categoria: string; por: string; quando: string }>; marcasOverride?: Record<string, { marca: string; por: string; quando: string }>; comDescricao?: string[]; alteracoes?: { tipo: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string; quando: string }[]; linhas: Linha[] };

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
  const [pendencia, setPendencia] = useState<Pendencia>("");
  const [ordem, setOrdem] = useState<Ordem>("estoque");
  const [pagina, setPagina] = useState(1);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [envios, setEnvios] = useState<Record<string, Envio>>({});
  // Linha sobre a qual o arquivo está sendo arrastado (computador).
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [configAberto, setConfigAberto] = useState(false);
  const [produtoConfig, setProdutoConfig] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  // Quem está mexendo: fica registrado no histórico (foto e nome). Guardado só neste aparelho.
  const [por, setPor] = useState("");
  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [textoNome, setTextoNome] = useState("");
  const [nomesAgora, setNomesAgora] = useState<Record<string, string | null>>({});
  const [marcasAgora, setMarcasAgora] = useState<Record<string, string | null>>({});
  const [selecionando, setSelecionando] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [destinoLote, setDestinoLote] = useState("");
  const [movendoLote, setMovendoLote] = useState(false);
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
  const comDescricao = useMemo(() => new Set(dados?.comDescricao ?? []), [dados]);
  const resumo = useMemo(() => resumirFotos(linhas), [linhas]);
  const filtradas = useMemo(() => {
    // Buscando por nome ou código: mostra o produto mesmo que já tenha foto (para trocar).
    const lista = filtrarLinhas(linhas, { busca, categoria, estoque, fotos: busca.trim() || pendencia ? "" : fotos, tipo, marcados }).filter((l) => !pendencia || temPendencia(l, pendencia, contextoPendencia(l)));
    const comparar: Record<Ordem, (a: LinhaFoto, b: LinhaFoto) => number> = {
      estoque: (a, b) => b.estoque - a.estoque,
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      categoria: (a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || b.estoque - a.estoque,
    };
    return [...lista].sort(comparar[ordem]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contextoPendencia lê dados, marcasAgora e nomesAgora, listados abaixo
  }, [linhas, busca, categoria, estoque, fotos, tipo, marcados, ordem, pendencia, dados, marcasAgora, nomesAgora]);

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

  /** Marca que o cliente lê hoje: a preenchida no painel, senão o laboratório do sistema (ou a que o nome cita). */
  function marcaAtual(l: LinhaFoto): { texto: string; preenchida: boolean } {
    const k = chaveDoNome(l.nome);
    const local = marcasAgora[k];
    if (local !== undefined) return local ? { texto: local, preenchida: true } : { texto: l.lab, preenchida: false };
    const salva = dados?.marcasOverride?.[k];
    return salva ? { texto: salva.marca, preenchida: true } : { texto: l.lab, preenchida: false };
  }

  async function salvarMarca(l: LinhaFoto, texto: string) {
    const nova = texto.replace(/\s+/g, " ").trim();
    if (nova === marcaAtual(l).texto.trim() || (!nova && !marcaAtual(l).preenchida)) return;
    try {
      const r = await fetch("/api/interno/produto/marca", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original: l.nome, marca: nova || null, por: por.trim() }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string } | null;
      if (!r.ok || !j?.ok) {
        setAviso(j?.erro === "marca_invalida" ? "Marca inválida: use de 2 a 60 letras, sem < nem >." : "Não consegui salvar a marca. Tente de novo.");
        return;
      }
      setMarcasAgora((m) => ({ ...m, [chaveDoNome(l.nome)]: nova || null }));
      setAviso(nova ? "Marca salva no histórico. Vale na próxima publicação (em alguns minutos)." : "Voltou à marca automática. Vale na próxima publicação (em alguns minutos).");
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    }
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
        return;
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

  /** Tira o produto do site (ele continua no PC). A equipe já está logada; a API registra quem e quando. */
  async function excluirProduto(l: LinhaPainel) {
    try {
      const r = await fetch("/api/interno/produto/excluir", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: l.nome, por: por.trim() }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) { setAviso("Não consegui excluir. Tente de novo."); return; }
      setExcluindo(null);
      setProdutoConfig(null);
      setAviso(j.publicando ? "Produto excluído. Sai do site em poucos minutos." : "Produto excluído. Sai do site na próxima atualização.");
      await carregar();
    } catch { setAviso("Não consegui excluir. Tente de novo."); }
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
        return;
      }
      setControladosAgora((n) => ({ ...n, [chaveDoNome(l.nome)]: estado }));
      const rotulo = estado === "auto" ? "automático" : estado === "sim" ? "controlado" : "não controlado";
      setAviso(`Enquadramento (${rotulo}) salvo. Vale na próxima publicação (em alguns minutos).`);
    } catch {
      setAviso("Não consegui salvar o enquadramento controlado. Tente de novo.");
    }
  }

  function contextoPendencia(l: LinhaFoto) {
    return { marca: marcaAtual(l).texto, nomeCorrigido: nomeAtual(l).corrigido, temDescricao: comDescricao.has(l.ean) };
  }

  /** Quantos itens do filtro atual (sem a própria pendência) caem em cada pendência: o número que aparece na lista. */
  const contagemPendencias = useMemo(() => {
    const base = filtrarLinhas(linhas, { busca, categoria, estoque, fotos: busca.trim() ? "" : fotos, tipo, marcados });
    const total: Record<string, number> = {};
    for (const p of Object.keys(ROTULOS_PENDENCIA) as Exclude<Pendencia, "">[]) total[p] = base.filter((l) => temPendencia(l, p, contextoPendencia(l))).length;
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contextoPendencia lê dados, marcasAgora e nomesAgora, listados abaixo
  }, [linhas, busca, categoria, estoque, fotos, tipo, marcados, dados, marcasAgora, nomesAgora, comDescricao]);

  function alternarSelecao(ean: string) {
    setSelecionados((antes) => {
      const novo = new Set(antes);
      if (novo.has(ean)) novo.delete(ean);
      else novo.add(ean);
      return novo;
    });
  }

  function sairDaSelecao() {
    setSelecionando(false);
    setSelecionados(new Set());
    setDestinoLote("");
  }

  /** Move todos os selecionados para a categoria escolhida, numa chamada só (uma publicação no fim). */
  async function moverSelecionados() {
    if (!destinoLote || selecionados.size === 0 || movendoLote) return;
    const escolhidos = linhas.filter((l) => selecionados.has(l.ean));
    setMovendoLote(true);
    try {
      const r = await fetch("/api/interno/produto/categoria/lote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ originais: escolhidos.map((l) => l.nome), categoria: destinoLote, por: por.trim() }),
      });
      if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
        setAviso("Sua sessão venceu. Recarregue a página (F5), entre de novo e tente outra vez.");
        return;
      }
      const j = (await r.json().catch(() => null)) as { ok?: boolean; erro?: string; aplicados?: string[]; bloqueados?: string[] } | null;
      if (!r.ok || !j?.ok) {
        setAviso(j?.erro === "pedido_invalido" ? "Selecione de 1 a 300 produtos." : "Não consegui mover os produtos. Tente de novo.");
        return;
      }
      const feitos = new Set((j.aplicados ?? []).map((n) => chaveDoNome(n)));
      setCategoriasAgora((n) => {
        const novo = { ...n };
        for (const k of feitos) novo[k] = destinoLote === "auto" ? "" : destinoLote;
        return novo;
      });
      if (destinoLote !== "auto" && destinoLote !== "Medicamentos") {
        setControladosAgora((n) => {
          const novo = { ...n };
          for (const k of feitos) novo[k] = "auto";
          return novo;
        });
      }
      const bloqueados = j.bloqueados ?? [];
      const destino = destinoLote === "auto" ? "a categoria automática" : destinoLote;
      setAviso(`${feitos.size} ${feitos.size === 1 ? "produto movido" : "produtos movidos"} para ${destino}. Vale na próxima publicação (em alguns minutos).${bloqueados.length ? ` ${bloqueados.length} ficaram de fora por serem receita ou controlado do sistema (não saem de Medicamentos).` : ""}`);
      sairDaSelecao();
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    } finally {
      setMovendoLote(false);
    }
  }

  async function salvarCategoria(l: LinhaPainel, categoria: string) {
    if (categoria !== "auto" && categoria !== "Medicamentos" && l.sistemaRestrito) {
      setAviso("Este item é receita ou controlado no sistema. Não pode sair de Medicamentos.");
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
          sistema_restrito: "Este item é receita ou controlado no sistema. Não pode sair de Medicamentos.",
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
      <header className="pf-cabeca">
        <h1>Produtos</h1>
        <p>Estoque do PC, fotos e ajustes do que aparece no site.</p>
      </header>
      <PainelCatalogo />
      {erro ? <p role="alert">Não consegui ler o estoque agora. O PC da loja ou o acesso aos dados pode estar parado. <button type="button" onClick={() => void carregar()}>Tentar de novo</button></p> : null}
      {!dados && !erro ? <p>Carregando o estoque…</p> : null}
      {dados ? (
        <>
          
          
          

          {dados.publicacaoRapida === false ? (
            <p className="pf-aviso" role="note">A publicação rápida está desligada (falta a chave do GitHub no Cloudflare). As fotos funcionam no site, mas o arquivo fixo só sai quando o GitHub rodar a sincronização, o que pode levar horas.</p>
          ) : null}
          {arrastando ? <p className="pf-solte" role="status">Solte aqui para enviar a foto de &ldquo;{linhas.find((x) => x.ean === arrastando)?.nome}&rdquo;</p> : null}
          {aviso ? <p className="pf-aviso" role="status">{aviso}</p> : null}

          <div className="pf-barra" role="search">
            <label className="pf-busca">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-4.4-4.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input type="search" value={busca} onChange={(e) => mudar(setBusca)(e.target.value)} placeholder="Buscar produto, laboratório ou código" aria-label="Buscar" />
            </label>
            <select className="pf-select" value={categoria} onChange={(e) => mudar(setCategoria)(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              <option value="__corrigir">A corrigir</option>
              {dados.categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select className="pf-select" value={fotos} onChange={(e) => mudar(setFotos)(e.target.value as FiltroFotos["fotos"])} aria-label="Fotos">
              <option value="faltam">Faltam foto</option>
              <option value="site">Já estão no site</option>
              <option value="">Todos</option>
            </select>
            <select className="pf-select" value={pendencia} onChange={(e) => mudar(setPendencia)(e.target.value as Pendencia)} aria-label="Pendências">
              <option value="">Todas as pendências</option>
              {(Object.keys(ROTULOS_PENDENCIA) as Exclude<Pendencia, "">[]).map((p) => <option key={p} value={p}>{ROTULOS_PENDENCIA[p]} ({contagemPendencias[p] ?? 0})</option>)}
            </select>
            <select className="pf-select" value={estoque} onChange={(e) => mudar(setEstoque)(e.target.value as FiltroFotos["estoque"])} aria-label="Estoque">
              <option value="com">Só com estoque</option>
              <option value="zero">Zerado ou negativo</option>
              <option value="">Todo estoque</option>
            </select>
          </div>
          <p className="pf-contagem" role="status"><b>{filtradas.length}</b> {filtradas.length === 1 ? "item" : "itens"} no filtro</p>
          <div className="pf-selecao-controle">
            <button type="button" className={`pf-botao${selecionando ? " pf-botao--primario" : ""}`} aria-pressed={selecionando} onClick={() => (selecionando ? sairDaSelecao() : setSelecionando(true))}>
              {selecionando ? "Sair da seleção" : "Selecionar vários"}
            </button>
            {selecionando ? (
              <>
                <button type="button" className="pf-botao" onClick={() => setSelecionados(new Set(filtradas.slice(0, 300).map((l) => l.ean)))}>
                  Selecionar os {Math.min(filtradas.length, 300)} do filtro
                </button>
                {filtradas.length > 300 ? <span className="pf-selecao-nota">Máximo de 300 por vez: refine o filtro.</span> : null}
              </>
            ) : null}
          </div>
          <div className="pf-grade">
            {visiveis.map((l) => {
              const faixa = l.estoque <= 0 ? "zero" : l.estoque <= 5 ? "baixo" : "normal";
              const urlFoto = pendentes.has(l.ean) || envios[l.ean] === "enviada" ? `/api/foto-nova?ean=${l.ean}&v=${envios[l.ean] === "enviada" ? "n" : "p"}` : `/produtos/${l.ean}.webp`;
              return (
                <article key={l.ean} data-ean={l.ean} tabIndex={0} onFocus={() => setAlvoColar(l.ean)} className={`pf-card${faixa === "zero" ? " pf-card--zero" : ""}`}>
                  <div className="pf-card-topo">
                    {selecionando ? (
                      <label className="pf-selecao-caixa">
                        <input type="checkbox" checked={selecionados.has(l.ean)} onChange={() => alternarSelecao(l.ean)} aria-label={`Selecionar ${nomeAtual(l).texto}`} />
                      </label>
                    ) : null}
                    <span className={`pf-qtd pf-qtd-${faixa}`} title={faixa === "zero" ? "Sem estoque" : faixa === "baixo" ? "Estoque baixo" : "Estoque normal"}>{l.estoque} un.</span>
                    {estadoControlado(l) === "sim" ? <span className="pf-chip pf-chip-ctl">Controlado</span> : null}
                    <button type="button" className="pf-engrenagem" onClick={() => setProdutoConfig(l.ean)} aria-label={`Configurar ${nomeAtual(l).texto}`}>
                      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="15" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="9" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                    </button>
                  </div>
                  <div className="pf-card-foto">
                    {l.noSite ? (
                      <img src={urlFoto} alt="" width="176" height="176" />
                    ) : (
                      <label className="pf-envio">
                        <input type="file" accept="image/*" disabled={envios[l.ean] === "enviando"} onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} />
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 16V5m0 0-4 4m4-4 4 4M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <span>{envios[l.ean] === "enviando" ? "Enviando…" : "Enviar foto"}</span>
                      </label>
                    )}
                  </div>
                  <h3 className="pf-card-nome" title={nomeAtual(l).texto}>{nomeAtual(l).texto}</h3>
                  <p className={marcaAtual(l).texto ? "pf-card-lab" : "pf-card-lab pf-card-lab-vazio"}>{marcaAtual(l).texto || "Sem marca informada"}</p>
                  <dl className="pf-card-dados">
                    <div><dt>Categoria</dt><dd>{categoriaEfetiva(l)}</dd></div>
                    <div><dt>Código</dt><dd className="pf-mono" title={l.ean}>{l.semCodigo ? "sem código" : l.ean}</dd></div>
                    <div><dt>Preço</dt><dd className="pf-preco">{REAIS.format(l.preco)}</dd></div>
                  </dl>
                </article>
              );
            })}
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
      {selecionando && selecionados.size > 0 ? (
        <div className="pf-selecao-barra" role="region" aria-label="Mover os produtos selecionados">
          <strong>{selecionados.size} {selecionados.size === 1 ? "selecionado" : "selecionados"}</strong>
          <select className="pf-select" value={destinoLote} onChange={(e) => setDestinoLote(e.target.value)} aria-label="Mover para a categoria">
            <option value="">Mover para…</option>
            <option value="auto">Automática (a do sistema)</option>
            {CATEGORIAS_VALIDAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" className="pf-botao pf-botao--primario" disabled={!destinoLote || movendoLote} onClick={() => void moverSelecionados()}>
            {movendoLote ? "Movendo…" : "Mover"}
          </button>
          <button type="button" className="pf-botao" onClick={() => setSelecionados(new Set())}>Limpar</button>
        </div>
      ) : null}
      {produtoConfig ? (() => {
        const l = linhas.find((x) => x.ean === produtoConfig);
        if (!l) return null;
        const urlFoto = pendentes.has(l.ean) || envios[l.ean] === "enviada" ? `/api/foto-nova?ean=${l.ean}&v=${envios[l.ean] === "enviada" ? "n" : "p"}` : `/produtos/${l.ean}.webp`;
        return (
          <div className="pf-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) setProdutoConfig(null); }}>
            <div className="pf-modal" role="dialog" aria-modal="true" aria-label={`Configurar ${nomeAtual(l).texto}`}>
              <div className="pf-modal-topo">
                <div>
                  <h2>{nomeAtual(l).texto}</h2>
                  <p className="pf-mono">{l.semCodigo ? "sem código de barras" : l.ean} · {REAIS.format(l.preco)} · {l.estoque} un.</p>
                </div>
                <button type="button" className="pf-modal-fechar" onClick={() => setProdutoConfig(null)} aria-label="Fechar">×</button>
              </div>
              <div className="pf-modal-corpo">
                <section className="pf-campo">
                  <span className="pf-campo-rotulo">Foto</span>
                  <div className="pf-foto-linha">
                    {l.noSite ? <img src={urlFoto} alt="" width="80" height="80" /> : <div className="pf-foto-vazia">Sem foto</div>}
                    <label className="pf-botao pf-botao--primario pf-botao--cheio">
                      <input type="file" accept="image/*" onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} />
                      {l.noSite ? "Trocar foto" : "Enviar foto"}
                    </label>
                  </div>
                </section>
                <label className="pf-campo">
                  <span className="pf-campo-rotulo">Nome</span>
                  <input className="pf-entrada" name="pf-nome" type="text" defaultValue={nomeAtual(l).texto} onBlur={(e) => void salvarNome(l, false, e.target.value)} />
                </label>
                <label className="pf-campo">
                  <span className="pf-campo-rotulo">Marca ou laboratório</span>
                  <input className="pf-entrada" name="pf-marca" type="text" maxLength={60} placeholder="Sem marca informada" defaultValue={marcaAtual(l).texto} />
                </label>
                <label className="pf-campo">
                  <span className="pf-campo-rotulo">Categoria</span>
                  <select className="pf-entrada" name="pf-categoria" value={estadoCategoria(l)} onChange={(e) => void salvarCategoria(l, e.target.value)}>
                    <option value="auto">Automático</option>
                    {CATEGORIAS_VALIDAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                {categoriaEfetiva(l) === "Medicamentos" ? (
                  <div className="pf-campo pf-campo--linha">
                    <span className="pf-campo-rotulo" id="pf-rotulo-ctl">Controlado</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={estadoControlado(l) === "sim"}
                      aria-labelledby="pf-rotulo-ctl"
                      className="pf-chave"
                      onClick={() => {
                        const novo = estadoControlado(l) === "sim" ? "nao" : "sim";
                        setControladosAgora((c) => ({ ...c, [chaveDoNome(l.nome)]: novo }));
                        void salvarControlado(l, novo);
                      }}
                    />
                  </div>
                ) : null}
              </div>
              {excluindo === l.ean ? (
                <div role="alertdialog" aria-label="Confirmar exclusão" className="pf-perigo">
                  <p>Excluir <b>{nomeAtual(l).texto}</b> do site? Ele continua no sistema da loja e só deixa de aparecer para o cliente.</p>
                  <div className="pf-modal-acoes">
                    <button type="button" className="pf-botao pf-botao--perigo" onClick={() => void excluirProduto(l)}>Sim, excluir</button>
                    <button type="button" className="pf-botao" onClick={() => setExcluindo(null)}>Não</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="pf-botao pf-botao--contorno-perigo" onClick={() => setExcluindo(l.ean)}>Excluir produto</button>
              )}
              <div className="pf-modal-acoes pf-modal-rodape">
                <button
                  type="button"
                  className="pf-botao pf-botao--primario pf-botao--cheio"
                  onClick={async (e) => {
                    // Só os campos deste popup (a página tem outros campos de texto e listas).
                    const popup = e.currentTarget.closest('[role="dialog"]');
                    const nomeInput = popup?.querySelector<HTMLInputElement>('input[name="pf-nome"]');
                    const catSelect = popup?.querySelector<HTMLSelectElement>('select[name="pf-categoria"]');
                    const marcaInput = popup?.querySelector<HTMLInputElement>('input[name="pf-marca"]');
                    if (marcaInput) await salvarMarca(l, marcaInput.value);
                    if (nomeInput && nomeInput.value.trim() && nomeInput.value.trim() !== nomeAtual(l).texto) {
                      await salvarNome(l, false, nomeInput.value.trim());
                    }
                    if (catSelect && catSelect.value !== estadoCategoria(l)) await salvarCategoria(l, catSelect.value);
                    setProdutoConfig(null);
                  }}
                >
                  Confirmar
                </button>
                <button type="button" className="pf-botao" onClick={() => setProdutoConfig(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        );
      })() : null}
    </>
  );
}
