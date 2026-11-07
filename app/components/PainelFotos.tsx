"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { candidatosDoArraste } from "../fotos-arrastar";
import { prepararFoto } from "./preparar-foto";
import { csvDasLinhas, filtrarLinhas, resumirFotos, type FiltroFotos, type LinhaFoto, type ResumoFotos } from "../fotos-painel";
import "../metrics-polish.css";
import "./painel-fotos.css";

type Linha = [string, string, string, string, number, number, number, number, number, string, number];
type Resposta = { ok: boolean; erro?: string; geradoEm: string | null; resumo: ResumoFotos; categorias: string[]; pendentes?: string[]; publicacaoRapida?: boolean; linhas: Linha[] };

const CHAVE_MARCAS = "uf_fotos_ok";
const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const POR_PAGINA = 100;

function paraLinha(l: Linha): LinhaFoto {
  return { ean: l[0], nome: l[1], lab: l[2], classe: l[3], estoque: l[4], preco: l[5], valor: l[6], controlado: l[7] === 1, antimicrobiano: l[8] === 1, categoria: l[9], noSite: l[10] === 1 };
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
  const [copiado, setCopiado] = useState<string | null>(null);
  // Linha escolhida com um toque: recebe a imagem colada (Ctrl+V).
  const [alvoColar, setAlvoColar] = useState<string | null>(null);
  const colarRef = useRef<(dt: DataTransfer) => void>(() => undefined);
  const soltarRef = useRef<(ean: string | null, dt: DataTransfer) => void>(() => undefined);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const r = await fetch("/api/interno/fotos", { cache: "no-store" });
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
  const linhas = useMemo(() => {
    const feitas = new Set([...pendentes, ...Object.entries(envios).filter(([, v]) => v === "enviada").map(([k]) => k)]);
    return (dados ? dados.linhas.map(paraLinha) : []).map((l) => (feitas.has(l.ean) ? { ...l, noSite: true } : l));
  }, [dados, pendentes, envios]);
  const resumo = useMemo(() => resumirFotos(linhas), [linhas]);
  const filtradas = useMemo(() => {
    const lista = filtrarLinhas(linhas, { busca, categoria, estoque, fotos, tipo, marcados });
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
        const r = await fetch("/api/interno/fotos/baixar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
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
    try {
      const arquivo = Array.isArray(origem) ? await imagemDaWeb(origem) : origem;
      if (!arquivo || (arquivo.type && !arquivo.type.startsWith("image/"))) throw new Error("origem");
      const imagem = await prepararFoto(arquivo);
      const r = await fetch("/api/interno/fotos/enviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ean: l.ean, nome: l.nome, imagem }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;
      if (!r.ok || !j?.ok) throw new Error("envio");
      setEnvios((e) => ({ ...e, [l.ean]: "enviada" }));
    } catch {
      setEnvios((e) => ({ ...e, [l.ean]: "erro" }));
      setAviso(Array.isArray(origem) ? "Não consegui baixar essa imagem do site (alguns sites bloqueiam). Salve a imagem no computador e arraste o arquivo, ou use \"Enviar foto\"." : "Não consegui enviar essa foto. Tente de novo ou use outra imagem (JPG, PNG ou WebP).");
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
      setAviso("");
      void enviarFoto(l, origem);
    };
  });

  useEffect(() => {
    colarRef.current = (dt) => {
      const l = alvoColar ? linhas.find((x) => x.ean === alvoColar) : undefined;
      if (!l || publicadas.has(l.ean)) {
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
      <p className="pf-nav">
        <a href="/interno/estoque">Alertas de estoque</a> · <a href="/interno/catalogo">Saúde do catálogo</a> · <a href="/interno/metricas">Métricas</a>
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
          <p className="pf-dados">Estoque de {dados.geradoEm ?? "—"}. No computador, arraste o arquivo da foto (ou a imagem de outro site, como o Google Imagens) para a linha do produto, ou toque na linha e cole com Ctrl+V uma imagem copiada; no celular, toque em &ldquo;Enviar foto&rdquo;. A foto aparece no site na hora; a publicação do arquivo fixo começa logo em seguida e leva alguns minutos.</p>

          {dados.publicacaoRapida === false ? (
            <p className="pf-aviso" role="note">A publicação rápida está desligada (falta a chave do GitHub no Cloudflare). As fotos funcionam no site, mas o arquivo fixo só sai quando o GitHub rodar a sincronização, o que pode levar horas.</p>
          ) : null}
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
                    data-ean={publicadas.has(l.ean) ? undefined : l.ean}
                    tabIndex={publicadas.has(l.ean) ? undefined : 0}
                    onFocus={publicadas.has(l.ean) ? undefined : () => setAlvoColar(l.ean)}
                    className={[l.estoque <= 0 ? "pf-zero" : "", arrastando === l.ean ? "pf-arrastando" : ""].filter(Boolean).join(" ") || undefined}
                  >
                    <td className="pf-foto">
                      {publicadas.has(l.ean) ? (
                        <img src={`/produtos/${l.ean}.webp`} alt="" width="40" height="40" loading="lazy" decoding="async" />
                      ) : l.noSite ? (
                        <span className="pf-enviada"><img src={`/api/foto-nova?ean=${l.ean}`} alt="" width="40" height="40" loading="lazy" decoding="async" /> enviada: já aparece no site</span>
                      ) : (
                        <label className={`pf-enviar${envios[l.ean] === "erro" ? " pf-erro" : ""}`}>
                          <input type="file" accept="image/*" disabled={envios[l.ean] === "enviando"} onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} aria-label={`Enviar foto de ${l.nome}`} />
                          {envios[l.ean] === "enviando" ? "Enviando…" : envios[l.ean] === "erro" ? "Falhou: tentar de novo" : "Enviar foto"}
                        </label>
                      )}
                    </td>
                    <td data-r="Código" className="pf-codigo">
                      <span>{l.ean}</span>
                      <button type="button" className="pf-copiar" onClick={() => void copiarCodigo(l.ean)} aria-label={`Copiar o código de barras ${l.ean}`}>{copiado === l.ean ? "Copiado!" : "Copiar"}</button>
                    </td>
                    <td className="pf-prod">
                      {l.nome}
                      {l.lab ? <small>{l.lab}</small> : null}
                      {l.controlado ? <em className="pf-tag">Controlado</em> : null}
                      {l.antimicrobiano ? <em className="pf-tag pf-tag-a">Antimicrob.</em> : null}
                    </td>
                    <td data-r="Categoria">{l.categoria}</td>
                    <td data-r="Estoque" className="pf-n">{l.estoque}</td>
                    <td data-r="Preço" className="pf-n">{REAIS.format(l.preco)}</td>
                    <td data-r="Valor" className="pf-n">{REAIS.format(l.valor)}</td>
                    <td data-r="Tenho no PC">{l.noSite ? <span className="pf-ok">no site</span> : <input type="checkbox" checked={marcados.has(l.ean)} onChange={(e) => marcar(l.ean, e.target.checked)} aria-label={`Tenho a foto de ${l.nome} no PC`} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  );
}
