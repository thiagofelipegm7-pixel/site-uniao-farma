"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import { useEffect, useMemo, useState } from "react";
import ReservarBotao from "../../reserva/ReservarBotao";
import { precoParaCentavos } from "../../reserva/reserva-store";
import { FAIXAS_PRECO, normalizarBusca, termosDaConsulta, type FaixaPreco } from "./busca";
import CartaoPanvel from "./CartaoPanvel";
import EsqueletoGrade from "./EsqueletoGrade";
import { quantidadeDoNome } from "./quantidade";
import { Cartao } from "./ListaRestrita";
import { FaixaLista, GrupoLateral, LateralTopo } from "./ListaDrogasil";
import Paginacao, { hrefPagina, irParaPagina, paginaDaUrl, POR_PAGINA } from "./Paginacao";
import type { ItemRestrito } from "./receita";

type OrdemMed = "relevancia" | "menor_preco" | "maior_preco";
const ORDENS_MED = [
  { id: "relevancia", label: "Mais relevantes" },
  { id: "menor_preco", label: "Menor preço" },
  { id: "maior_preco", label: "Maior preço" },
] as const;
const centavosDe = (l: Linha): number | null => (l.otc ? precoParaCentavos(l.otc.precoFmt) : typeof l.restrito?.preco === "number" ? Math.round(l.restrito.preco * 100) : null);
const labDe = (l: Linha) => (l.otc?.lab ?? l.restrito?.lab ?? "").trim();
const noFaixa = (c: number | null, f: FaixaPreco) => c !== null && (f === "ate_15" ? c <= 1500 : f === "de_15_a_25" ? c > 1500 && c <= 2500 : c > 2500);
function alternarItem<T>(lista: T[], v: T): T[] {
  return lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v];
}

export type MedicamentoSemReceita = { nome: string; slug: string; lab: string; precoFmt: string; foto: string | null; isMIP: boolean; restam?: number; esgotado?: boolean };
type Origem = "sem-receita" | "receita" | "controlados";
type Linha = { chave: string; nome: string; busca: string; origem: Origem; otc?: MedicamentoSemReceita; restrito?: ItemRestrito };

const esgotada = (l: Linha) => Number(l.otc?.esgotado === true || l.restrito?.esgotado === true);
/** Alfabética, com os esgotados no fim. */
const comparar = (a: Linha, b: Linha) => esgotada(a) - esgotada(b) || a.nome.localeCompare(b.nome, "pt-BR");
const linhaOtc = (i: MedicamentoSemReceita): Linha => ({ chave: `o-${i.slug}`, nome: i.nome, busca: normalizarBusca(`${i.nome} ${i.lab}`), origem: "sem-receita", otc: i });
const linhaRestrita = (i: ItemRestrito): Linha => ({
  chave: `${i.tipo}-${i.slug ?? i.nome}`,
  nome: i.nomeExibicao ?? i.nome,
  busca: i.busca ?? normalizarBusca(i.nome),
  origem: i.tipo === "consulte" ? "sem-receita" : i.tipo,
  restrito: i,
});

/**
 * Departamento Medicamentos completo: sem receita (com cesta), com receita, controlados e "consulte o farmacêutico",
 * numa lista só, com busca. Sem abas/filtros de categoria — a página mostra todos. Receita e controlados entram na
 * cesta só para retirada na loja, com a receita.
 */
export default function MedicamentosTodos({ otcInicial, unitId, paginaInicial = 1 }: { otcInicial: MedicamentoSemReceita[]; unitId: string; paginaInicial?: number }) {
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(paginaInicial);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA);
  const [ordem, setOrdem] = useState<OrdemMed>("relevancia");
  const [marcas, setMarcas] = useState<string[]>([]);
  const [faixas, setFaixas] = useState<FaixaPreco[]>([]);
  const [restritos, setRestritos] = useState<Linha[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = (params.get("q") ?? "").slice(0, 80);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- página estática: o termo só existe na barra de endereço
    setConsulta(q);
    // Links antigos com ?filtro=… continuam abrindo a lista completa, sem erro (categoria removida).
    if (params.has("filtro")) {
      params.delete("filtro");
      const qs = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
    }
    let cancelado = false;
    (async () => {
      try {
        const idx = await fetch("/dados/nacoes/restritos-index.json").then((r) => r.json());
        if (cancelado) return;
        // Todas as fatias ao mesmo tempo (antes era uma depois da outra), na mesma ordem: receita, depois controlados.
        const enderecos = (["receita", "controlados"] as const).flatMap((tipo) => Array.from({ length: idx[tipo]?.paginas ?? 0 }, (_, k) => k + 1).map((p) => `/dados/nacoes/restritos/${tipo}/p${p}.json`));
        const fatias: ItemRestrito[][] = await Promise.all(enderecos.map((u) => fetch(u).then((r) => (r.ok ? r.json() : []))));
        if (cancelado) return;
        setRestritos(fatias.flat().map(linhaRestrita));
      } catch (erro) {
        console.error(erro);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const todas = useMemo(() => [...otcInicial.map(linhaOtc), ...restritos].sort(comparar), [otcInicial, restritos]);
  const termos = termosDaConsulta(consulta);
  const porBusca = useMemo(
    () => todas.filter((l) => termos.every((t) => l.busca.includes(t))),
    [todas, consulta], // eslint-disable-line react-hooks/exhaustive-deps -- termos deriva de consulta
  );
  const opcoesMarca = useMemo(() => [...new Set(porBusca.map(labDe).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [porBusca]);
  const visiveis = useMemo(() => {
    const lista = porBusca.filter((l) => (marcas.length === 0 || marcas.includes(labDe(l))) && (faixas.length === 0 || faixas.some((f) => noFaixa(centavosDe(l), f))));
    if (ordem === "relevancia") return lista;
    const sinal = ordem === "menor_preco" ? 1 : -1;
    // Esgotados e sem preço sempre no fim.
    return [...lista].sort((a, b) => esgotada(a) - esgotada(b) || (centavosDe(a) === null ? 1 : 0) - (centavosDe(b) === null ? 1 : 0) || sinal * ((centavosDe(a) ?? 0) - (centavosDe(b) ?? 0)));
  }, [porBusca, marcas, faixas, ordem]);
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  // Troca de busca volta à página 1 (e tira ?pagina= do endereço).
  function irParaPaginaLocal(n: number) {
    setPagina(n);
    if (n === 1 && new URLSearchParams(window.location.search).has("pagina")) {
      const u = new URL(window.location.href);
      u.searchParams.delete("pagina");
      window.history.replaceState(null, "", u);
    }
  }
  useEffect(() => {
    const ler = () => setPagina(paginaDaUrl(window.location.search));
    window.addEventListener("popstate", ler);
    return () => window.removeEventListener("popstate", ler);
  }, []);

  return (
    <section aria-label="Todos os medicamentos" className="pv-layout">
      <aside className="pv-filtros" aria-label="Filtros">
        <LateralTopo total={visiveis.length} rotulo="medicamento" atual="medicamentos" carregando={carregando && consulta.trim().length > 0} />
        <GrupoLateral titulo="Preço">
          <div className="dg-opcoes">
            {FAIXAS_PRECO.map((f) => (
              <label key={f.id} className="catalogo-filtro-opcao">
                <input type="checkbox" checked={faixas.includes(f.id)} onChange={() => { setFaixas((a) => alternarItem(a, f.id)); irParaPaginaLocal(1); }} />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </GrupoLateral>
        {opcoesMarca.length > 0 ? (
          <GrupoLateral titulo="Marca">
            <div className="dg-opcoes dg-opcoes--rolar">
              {opcoesMarca.map((m) => (
                <label key={m} className="catalogo-filtro-opcao">
                  <input type="checkbox" checked={marcas.includes(m)} onChange={() => { setMarcas((a) => alternarItem(a, m)); irParaPaginaLocal(1); }} />
                  <span>{m}</span>
                </label>
              ))}
            </div>
          </GrupoLateral>
        ) : null}
      </aside>
      <div className="pv-conteudo">
      {carregando ? <p className="medicamentos-contagem" aria-live="polite">Carregando as listas de receita e controlados…</p> : null}
      <FaixaLista
        porPagina={porPagina}
        aoMudarPorPagina={(n) => { setPorPagina(n); irParaPaginaLocal(1); }}
        ordem={ordem}
        opcoesOrdem={ORDENS_MED}
        aoMudarOrdem={(id) => { setOrdem(id as OrdemMed); irParaPaginaLocal(1); }}
        paginacao={<Paginacao variante="barra" atual={paginaAtual} total={totalPaginas} href={(n) => hrefPagina(n, consulta)} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />}
      />
      {carregando && visiveis.length === 0 ? <EsqueletoGrade /> : null}
      <ul className="catalogo-lista pv-grade">
        {visiveis.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina).map((l) => {
          if (l.restrito) return <Cartao key={l.chave} item={l.restrito} />;
          const i = l.otc!;
          const centavos = precoParaCentavos(i.precoFmt);
          return (
            <CartaoPanvel
              key={l.chave}
              href={`/nacoes-unidas/produtos/${i.slug}`}
              nome={i.nome}
              foto={i.foto}
              marca={i.lab}
              apresentacao={quantidadeDoNome(i.nome)}
              precoFmt={i.precoFmt}
              restam={i.restam}
              esgotado={i.esgotado}
              cesta={centavos && !i.esgotado ? <ReservarBotao unitId={unitId} nome={i.nome} precoCentavos={centavos} foto={i.foto} variante="cartao" max={i.restam} slug={i.slug} /> : null}
            />
          );
        })}
      </ul>
      <Paginacao atual={paginaAtual} total={totalPaginas} href={(n) => hrefPagina(n, consulta)} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />
      {!carregando && visiveis.length === 0 ? <p className="catalogo-vazio">Não encontramos medicamentos com esse nome. Fale com a loja pelo WhatsApp.</p> : null}
      </div>
    </section>
  );
}
