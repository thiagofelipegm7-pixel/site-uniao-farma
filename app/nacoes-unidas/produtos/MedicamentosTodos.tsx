"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Links nativos: a navegação do cliente falha no Vinext em produção. */
/* eslint-disable @next/next/no-img-element -- Imagem estática pequena, igual ao restante do catálogo. */
import { useEffect, useMemo, useState } from "react";
import BotaoVoz from "../../shop/BotaoVoz";
import ReservarBotao from "../../reserva/ReservarBotao";
import { precoParaCentavos } from "../../reserva/reserva-store";
import { normalizarBusca, termosDeBusca } from "./busca";
import CartaoPanvel from "./CartaoPanvel";
import { quantidadeDoNome } from "./quantidade";
import { Cartao } from "./ListaRestrita";
import Paginacao, { hrefPagina, irParaPagina, paginaDaUrl, POR_PAGINA } from "./Paginacao";
import type { ItemRestrito } from "./receita";

export type MedicamentoSemReceita = { nome: string; slug: string; lab: string; precoFmt: string; foto: string | null; isMIP: boolean };
type Aba = "todos" | "sem-receita" | "receita" | "controlados";
type Linha = { chave: string; nome: string; busca: string; aba: Exclude<Aba, "todos">; otc?: MedicamentoSemReceita; restrito?: ItemRestrito };

const ABAS: ReadonlyArray<{ id: Aba; rotulo: string }> = [
  { id: "todos", rotulo: "Todos" },
  { id: "sem-receita", rotulo: "Sem receita" },
  { id: "receita", rotulo: "Com receita" },
  { id: "controlados", rotulo: "Controlados" },
];

const comparar = (a: Linha, b: Linha) => a.nome.localeCompare(b.nome, "pt-BR");
const linhaOtc = (i: MedicamentoSemReceita): Linha => ({ chave: `o-${i.slug}`, nome: i.nome, busca: normalizarBusca(`${i.nome} ${i.lab}`), aba: "sem-receita", otc: i });
const linhaRestrita = (i: ItemRestrito): Linha => ({ chave: `${i.tipo}-${i.slug ?? i.nome}`, nome: i.nomeExibicao ?? i.nome, busca: i.busca ?? normalizarBusca(i.nome), aba: i.tipo, restrito: i });

/**
 * Departamento Medicamentos completo: sem receita (com cesta), com receita, controlados e "consulte o farmacêutico",
 * numa lista só, com busca e abas. Receita e controlados entram na cesta só para retirada na loja, com a receita.
 */
export default function MedicamentosTodos({ otcInicial, unitId, paginaInicial = 1 }: { otcInicial: MedicamentoSemReceita[]; unitId: string; paginaInicial?: number }) {
  const [aba, setAba] = useState<Aba>("todos");
  const [consulta, setConsulta] = useState("");
  const [pagina, setPagina] = useState(paginaInicial);
  const [restritos, setRestritos] = useState<Linha[]>([]);
  const [totais, setTotais] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const q = (new URLSearchParams(window.location.search).get("q") ?? "").slice(0, 80);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- página estática: o termo só existe na barra de endereço
    setConsulta(q);
    let cancelado = false;
    (async () => {
      try {
        const idx = await fetch("/dados/nacoes/restritos-index.json").then((r) => r.json());
        if (cancelado) return;
        setTotais({ receita: idx.receita?.total ?? 0, controlados: idx.controlados?.total ?? 0 });
        const acumulado: Linha[] = [];
        for (const tipo of ["receita", "controlados"] as const) {
          for (let p = 1; p <= (idx[tipo]?.paginas ?? 0); p += 1) {
            const pagina: ItemRestrito[] = await fetch(`/dados/nacoes/restritos/${tipo}/p${p}.json`).then((r) => r.json());
            if (cancelado) return;
            acumulado.push(...pagina.map(linhaRestrita));
            setRestritos([...acumulado]);
          }
        }
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
  const termos = termosDeBusca(consulta);
  const visiveis = useMemo(
    () => todas.filter((l) => (aba === "todos" || l.aba === aba) && termos.every((t) => l.busca.includes(t))),
    [todas, aba, consulta], // eslint-disable-line react-hooks/exhaustive-deps -- termos deriva de consulta
  );
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  // Troca de aba ou de busca volta à página 1 (e tira ?pagina= do endereço).
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
  const contagem = (id: Aba) => (id === "todos" ? otcInicial.length + (totais.receita ?? 0) + (totais.controlados ?? 0) : id === "sem-receita" ? otcInicial.length : (totais[id] ?? 0));

  return (
    <section aria-label="Todos os medicamentos">
      <div className="medicamentos-abas" role="tablist" aria-label="Tipo de medicamento">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={aba === a.id}
            className={aba === a.id ? "is-on" : undefined}
            onClick={() => {
              setAba(a.id);
              irParaPaginaLocal(1);
            }}
          >
            {a.rotulo} <span>{contagem(a.id).toLocaleString("pt-BR")}</span>
          </button>
        ))}
      </div>
      <form className="medicamentos-busca" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="medicamentos-q">Buscar nos medicamentos</label>
        <div className="voz-campo">
          <input id="medicamentos-q" type="search" value={consulta} maxLength={80} placeholder="Nome ou princípio ativo" onChange={(e) => { setConsulta(e.target.value); irParaPaginaLocal(1); }} />
          <BotaoVoz contexto="medicamentos" onTexto={(texto) => { setConsulta(texto); irParaPaginaLocal(1); }} />
        </div>
      </form>
      <p className="medicamentos-contagem" aria-live="polite">
        {visiveis.length.toLocaleString("pt-BR")} {visiveis.length === 1 ? "medicamento" : "medicamentos"}
        {carregando ? " · carregando as listas de receita e controlados…" : ""}
      </p>
      <ul className="catalogo-lista pv-grade">
        {visiveis.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA).map((l) => {
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
              cesta={centavos ? <ReservarBotao unitId={unitId} nome={i.nome} precoCentavos={centavos} foto={i.foto} variante="cesta" compacto /> : null}
            />
          );
        })}
      </ul>
      <Paginacao atual={paginaAtual} total={totalPaginas} href={(n) => hrefPagina(n, consulta)} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />
      {!carregando && visiveis.length === 0 ? <p className="catalogo-vazio">Não encontramos medicamentos com esse nome. Fale com a loja pelo WhatsApp.</p> : null}
    </section>
  );
}
