"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { prepararFoto } from "./preparar-foto";
import { csvDasLinhas, filtrarLinhas, resumirFotos, type FiltroFotos, type LinhaFoto, type ResumoFotos } from "../fotos-painel";
import "../metrics-polish.css";
import "./painel-fotos.css";

type Linha = [string, string, string, string, number, number, number, number, number, string, number];
type Resposta = { ok: boolean; erro?: string; geradoEm: string | null; resumo: ResumoFotos; categorias: string[]; pendentes?: string[]; linhas: Linha[] };

const CHAVE_MARCAS = "uf_fotos_ok";
const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const POR_PAGINA = 100;

function paraLinha(l: Linha): LinhaFoto {
  return { ean: l[0], nome: l[1], lab: l[2], classe: l[3], estoque: l[4], preco: l[5], valor: l[6], controlado: l[7] === 1, antimicrobiano: l[8] === 1, categoria: l[9], noSite: l[10] === 1 };
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

  const linhas = useMemo(() => (dados ? dados.linhas.map(paraLinha) : []), [dados]);
  const pendentes = useMemo(() => new Set(dados?.pendentes ?? []), [dados]);
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

  async function enviarFoto(l: LinhaFoto, arquivo: File | undefined) {
    if (!arquivo) return;
    setEnvios((e) => ({ ...e, [l.ean]: "enviando" }));
    try {
      const imagem = await prepararFoto(arquivo);
      const r = await fetch("/api/interno/fotos/enviar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ean: l.ean, nome: l.nome, imagem }) });
      const j = (await r.json().catch(() => null)) as { ok?: boolean } | null;
      if (!r.ok || !j?.ok) throw new Error("envio");
      setEnvios((e) => ({ ...e, [l.ean]: "enviada" }));
    } catch {
      setEnvios((e) => ({ ...e, [l.ean]: "erro" }));
    }
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
            <div><strong>{resumo.comFoto}</strong><span>com foto no site (de {resumo.total} itens)</span></div>
            <div><strong>{resumo.faltamComEstoque}</strong><span>faltam foto e têm estoque</span></div>
            <div><strong>{REAIS.format(resumo.valorSemFoto)}</strong><span>em estoque sem foto</span></div>
            <div><strong>{resumo.comEstoque > 0 ? Math.round((resumo.comEstoqueComFoto / resumo.comEstoque) * 100) : 0}%</strong><span>dos itens com estoque já têm foto</span></div>
          </section>
          <p className="pf-dados">Estoque de {dados.geradoEm ?? "—"}. Toque em &ldquo;Enviar foto&rdquo; no produto que falta: a foto entra no site em até 15 minutos e sai de &ldquo;faltam&rdquo; sozinha.</p>

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
                  <tr key={l.ean} className={l.estoque <= 0 ? "pf-zero" : undefined}>
                    <td className="pf-foto">
                      {l.noSite ? (
                        <img src={`/produtos/${l.ean}.webp`} alt="" width="40" height="40" loading="lazy" decoding="async" />
                      ) : envios[l.ean] === "enviada" || pendentes.has(l.ean) ? (
                        <span className="pf-enviada">enviada: entra no site em até 15 min</span>
                      ) : (
                        <label className={`pf-enviar${envios[l.ean] === "erro" ? " pf-erro" : ""}`}>
                          <input type="file" accept="image/*" disabled={envios[l.ean] === "enviando"} onChange={(e) => { void enviarFoto(l, e.target.files?.[0]); e.target.value = ""; }} aria-label={`Enviar foto de ${l.nome}`} />
                          {envios[l.ean] === "enviando" ? "Enviando…" : envios[l.ean] === "erro" ? "Falhou: tentar de novo" : "Enviar foto"}
                        </label>
                      )}
                    </td>
                    <td data-r="Código">{l.ean}</td>
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
