use client;

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

type Ordem = "nome" | "estoque" | "categoria";

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

  // ... (rest of the file will be completed if this works, but to avoid truncation issues, better way)
