"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidatosDoArraste } from "../fotos-arrastar";
import { chaveDoNome } from "../nomes-corrigidos";
import { nomeDeExibicao } from "../nome-exibicao";
import { prepararFoto } from "./preparar-foto";
import { csvDasLinhas, filtrarLinhas, resumirFotos, type FiltroFotos, type LinhaFoto, type ResumoFotos } from "../fotos-painel";
import "../metrics-polish.css";
import "./painel-fotos.css";

type Linha = [string, string, string, string, number, number, number, number, number, string, number, number?];
type Resposta = { ok: boolean; erro?: string; geradoEm: string | null; resumo: ResumoFotos; categorias: string[]; pendentes?: string[]; removidas?: string[]; publicacaoRapida?: boolean; nomes?: Record<string, { nome: string; por: string; quando: string }>; alteracoes?: { tipo: string; titulo: string; acao: string; anterior: string | null; novo: string | null; por: string; quando: string }[]; linhas: Linha[] };

const CHAVE_MARCAS = "uf_fotos_ok";
const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const POR_PAGINA = 100;

function paraLinha(l: Linha): LinhaFoto {
  return { ean: l[0], nome: l[1], lab: l[2], classe: l[3], estoque: l[4], preco: l[5], valor: l[6], controlado: l[7] === 1, antimicrobiano: l[8] === 1, categoria: l[9], noSite: l[10] === 1, ...(l[11] === 1 ? { semCodigo: true } : {}) };
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

type Ordem = "valor" | "nome" | "estoque" | "categoria";

export default function PainelFotos() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [estoque, setEstoque] = useState<FiltroFotos["estoque"]>("com");
  const [fotos, setFotos] = useState<FiltroFotos["fotos"]>("faltam");
  const [tipo, setTipo] = useState<FiltroFotos["tipo"]>("");
  const [ordem, setOrdem] = useState<Ordem>("valor");
  const [pagina, setPagina] = useState(1);
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [envios, setEnvios] = useState<Record<string, Envio>>({});
  // Linha sobre a qual o arquivo está sendo arrastado (computador).
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  // Quem está mexendo: fica registrado no histórico (foto e nome). Guardado só neste aparelho.
  const [por, setPor] = useState("");
  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [textoNome, setTextoNome] = useState("");
  const [nomesAgora, setNomesAgora] = useState<Record<string, string | null>>({});
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
      valor: (a, b) => b.valor - a.valor || b.estoque - a.estoque,
      estoque: (a, b) => b.estoque - a.estoque,
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      categoria: (a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || b.valor - a.valor,
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

  async function salvarNome(l: LinhaFoto, voltar = false) {
    if (por.trim().length < 2) {
      setAviso("Escreva seu nome no topo antes de mexer no nome do produto: fica registrado quem mexeu.");
      return;
    }
    try {
      const r = await fetch(voltar ? "/api/interno/produto/nome/desfazer" : "/api/interno/produto/nome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ original: l.nome, nome: textoNome, por: por.trim() }),
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

  function baixarCsv() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csvDasLinhas(filtradas, marcados)], { type: "text/csv;charset=utf-8" }));
    a.download = "fotos-filtro.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const mudar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPagina(1);
  };

  return (
    <section className="painel-fotos">
      <h1>Fotos dos produtos</h1>
      <label className="pf-quem">
        Quem está mexendo?
        <input type="text" value={por} onChange={(e) => guardarPor(e.target.value)} placeholder="Seu nome (fica no histórico)" maxLength={60} autoComplete="name" />
      </label>
      <p className="pf-nav">
        <a href="/interno/revisao">Fila de revisão</a> · <a href="/interno/erros">Erros no celular</a> · <a href="/interno/estoque">Alertas de estoque</a> · <a href="/interno/catalogo">Saúde do catálogo</a> · <a href="/interno/metricas">Métricas</a>
      </p>
      {erro ? <p role="alert">Não consegui ler o estoque agora. O PC da loja ou o acesso aos dados pode estar parado. <button type="button" onClick={() => void carregar()}>Tentar de novo</button></p> : null}
      {!dados && !erro ? <p>Carregando o estoque…</p> : null}
      {dados ? (
        <>
          <section className="pf-resumo" aria-label="Resumo">
            <div><strong>{resumo.aVendaComFoto}</strong><span>com foto, de {resumo.aVenda} itens à venda no site</span></div>
            <div><strong>{resumo.aVendaFaltamComEstoque}</strong><span>faltam foto e têm estoque</span></div>
            <div><strong>{REAIS.format(resumo.aVendaValorSemFoto)}</strong><span>em estoque (preço de venda) sem foto</span></div>
            <div><strong>{resumo.aVendaComEstoque > 0 ? Math.round((resumo.aVendaComEstoqueComFoto / resumo.aVendaComEstoque) * 100) : 0}%</strong><span>dos itens à venda com estoque já têm foto</span></div>
          </section>
          <p className="pf-dados">Não entram nessa conta {resumo.fora} itens que não mostram foto na loja: medicamentos com receita, controlados e itens que não estão no site. A lista abaixo mostra todos.</p>
          <p className="pf-dados">Estoque de {dados.geradoEm ?? "—"}. No computador, arraste o arquivo da foto (ou a imagem de outro site, como o Google Imagens) para a linha do produto, ou toque na linha e cole com Ctrl+V uma imagem copiada; no celular, toque em &ldquo;Enviar foto&rdquo;. A foto aparece no site na hora; o arquivo fixo é publicado em lote, em até 30 minutos.</p>

          {dados.publicacaoRapida === false ? (
            <p className="pf-aviso" role="note">A publicação rápida está desligada (falta a chave do GitHub no Cloudflare). As fotos funcionam no site, mas o arquivo fixo só sai quando o GitHub rodar a sincronização, o que pode levar horas.</p>
          ) : null}
          {arrastando ? <p className="pf-solte" role="status">Solte aqui para enviar a foto de &ldquo;{linhas.find((x) => x.ean === arrastando)?.nome}&rdquo;</p> : null}
          {aviso ? <p className="pf-aviso" role="status">{aviso}</p> : null}

          <div className="pf-filtros">
            <input type="search" value={busca} onChange={(e) => mudar(setBusca)(e.target.value)} placeholder="Buscar produto, laboratório ou código de barras" aria-label="Buscar" />
            <select value={categoria} onChange={(e) => mudar(setCategoria)(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {dados.categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={fotos} onChange={(e) => mudar(setFotos)(e.target.value as FiltroFotos["fotos"])} aria-label="Fotos">
              <option value="faltam">Faltam foto</option>
              <option value="site">Já estão no site</option>
              <option value="pc">Tenho no PC e falta subir</option>
              <option value="">Todos</option>
            </select>
            <select value={estoque} onChange={(e) => mudar(setEstoque)(e.target.value as FiltroFotos["estoque"])} aria-label="Estoque">
              <option value="com">Só com estoque</option>
              <option value="zero">Zerado ou negativo</option>
              <option value="">Todo estoque</option>
            </select>
            <select value={tipo} onChange={(e) => mudar(setTipo)(e.target.value as FiltroFotos["tipo"])} aria-label="Tipo">
              <option value="">Todos os tipos</option>
              <option value="controlado">Controlados</option>
              <option value="antimicrobiano">Antimicrobianos</option>
              <option value="semcodigo">Sem código de barras</option>
            </select>
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} aria-label="Ordenar por">
              <option value="valor">Maior valor em estoque primeiro</option>
              <option value="estoque">Mais unidades primeiro</option>
              <option value="nome">Nome (A a Z)</option>
              <option value="categoria">Categoria</option>
            </select>
            <button type="button" onClick={baixarCsv}>Baixar lista do filtro (CSV)</button>
          </div>

          <p className="pf-contagem" role="status">{filtradas.length} {filtradas.length === 1 ? "item" : "itens"} no filtro</p>
          <div className="pf-tabela">
            <table>
              <thead>
                <tr><th scope="col">Foto</th><th scope="col">Código</th><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Estoque</th><th scope="col">Preço</th><th scope="col">Valor</th><th scope="col">Tenho no PC</th></tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr
                    key={l.ean}
                    data-ean={l.ean}
                    tabIndex={0}
                    onFocus={() => setAlvoColar(l.ean)}
                    className={[l.estoque <= 0 ? "pf-zero" : "", arrastando === l.ean ? "pf-arrastando" : ""].filter(Boolean).join(" ") || undefined}
                  >
                    <td className="pf-foto">
                      {l.noSite ? (
                        <span className="pf-foto-atual">
                          <img src={pendentes.has(l.ean) || envios[l.ean] === "enviada" ? `/api/foto-nova?ean=${l.ean}&v=${envios[l.ean] === "enviada" ? "n" : "p"}` : `/produtos/${l.ean}.webp`} alt="" width="40" height="40" loading="lazy" decoding="async" />
                          <label className={`pf-trocar${envios[l.ean] === "erro" ? " pf-erro" : ""}`}>
                            <input type="file" accept="image/*" disabled={envios[l.ean] === "enviando"} onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} aria-label={`Trocar a foto de ${l.nome}`} />
                            {envios[l.ean] === "enviando" ? "Enviando…" : envios[l.ean] === "erro" ? "Falhou: tentar de novo" : envios[l.ean] === "enviada" ? "Trocada: já aparece no site" : pendentes.has(l.ean) ? "Enviada: trocar de novo" : "Trocar foto"}
                          </label>
                          <button type="button" className="pf-remover" onClick={() => void removerFoto(l)} aria-label={`Tirar a foto de ${l.nome}`}>Tirar foto</button>
                        </span>
                      ) : (
                        <label className={`pf-enviar${envios[l.ean] === "erro" ? " pf-erro" : ""}`}>
                          <input type="file" accept="image/*" disabled={envios[l.ean] === "enviando"} onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} aria-label={`Enviar foto de ${l.nome}`} />
                          {envios[l.ean] === "enviando" ? "Enviando…" : envios[l.ean] === "erro" ? "Falhou: tentar de novo" : "Enviar foto"}
                        </label>
                      )}
                    </td>
                    <td data-r="Código" className="pf-codigo">
                      {l.semCodigo ? (
                        <span className="pf-sem-codigo">sem código de barras</span>
                      ) : (
                        <>
                          <span>{l.ean}</span>
                          <button type="button" className="pf-copiar" onClick={() => void copiarCodigo(l.ean)} aria-label={`Copiar o código de barras ${l.ean}`}>{copiado === l.ean ? "Copiado!" : "Copiar"}</button>
                        </>
                      )}
                    </td>
                    <td className="pf-prod">
                      {editandoNome === l.ean ? (
                        <span className="pf-nome-edicao">
                          <input type="text" value={textoNome} onChange={(e) => setTextoNome(e.target.value)} maxLength={120} aria-label={`Novo nome de ${l.nome}`} />
                          <button type="button" className="pf-nome-salvar" onClick={() => void salvarNome(l)}>Salvar nome</button>
                          <button type="button" onClick={() => setEditandoNome(null)}>Cancelar</button>
                          {nomeAtual(l).corrigido ? <button type="button" onClick={() => void salvarNome(l, true)}>Voltar ao automático</button> : null}
                        </span>
                      ) : (
                        <>
                          {nomeAtual(l).texto}
                          <button type="button" className="pf-nome-editar" onClick={() => { setEditandoNome(l.ean); setTextoNome(nomeAtual(l).texto); }} aria-label={`Editar o nome de ${l.nome}`}>Editar nome</button>
                          {nomeAtual(l).corrigido ? <em className="pf-tag pf-tag-n">Nome corrigido</em> : null}
                          <small className="pf-original">No sistema: {l.nome}</small>
                        </>
                      )}
                      {l.lab ? <small>{l.lab}</small> : null}
                      {l.controlado ? <em className="pf-tag">Controlado</em> : null}
                      {l.antimicrobiano ? <em className="pf-tag pf-tag-a">Antimicrob.</em> : null}
                    </td>
                    <td data-r="Categoria">{l.categoria}</td>
                    <td data-r="Estoque" className="pf-n"><span className={`pf-qtd pf-qtd-${l.estoque <= 0 ? "zero" : l.estoque <= 5 ? "baixo" : "normal"}`} title={l.estoque <= 0 ? "Zerado" : l.estoque <= 5 ? "Estoque baixo" : "Estoque normal"}>{l.estoque}</span></td>
                    <td data-r="Preço" className="pf-n">{REAIS.format(l.preco)}</td>
                    <td data-r="Valor" className="pf-n">{REAIS.format(l.valor)}</td>
                    <td data-r="Tenho no PC">{l.noSite ? <span className="pf-ok">no site</span> : <input type="checkbox" checked={marcados.has(l.ean)} onChange={(e) => marcar(l.ean, e.target.checked)} aria-label={`Tenho a foto de ${l.nome} no PC`} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dados.alteracoes && dados.alteracoes.length > 0 ? (
            <section className="pf-historico" aria-label="Últimas alterações">
              <h2>Últimas alterações</h2>
              <ul>
                {dados.alteracoes.map((a, i) => (
                  <li key={`${a.quando}-${i}`}>
                    <strong>{a.por}</strong> {a.acao}: {a.titulo}
                    {a.tipo === "nome" && a.novo ? <> → “{a.novo}”{a.anterior ? <> (antes “{a.anterior}”)</> : null}</> : null}
                    <small> · {new Date(a.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
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
  );
}
