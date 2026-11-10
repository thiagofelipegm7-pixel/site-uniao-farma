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
    () => todas.filter((l) => termos.every((t) => l.busca.includes(t))),
    [todas, consulta], // eslint-disable-line react-hooks/exhaustive-deps -- termos deriva de consulta
  );
  const totalPaginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
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
    <section aria-label="Todos os medicamentos">
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
              restam={i.restam}
              esgotado={i.esgotado}
              cesta={centavos && !i.esgotado ? <ReservarBotao unitId={unitId} nome={i.nome} precoCentavos={centavos} foto={i.foto} variante="cartao" max={i.restam} slug={i.slug} /> : null}
            />
          );
        })}
      </ul>
      <Paginacao atual={paginaAtual} total={totalPaginas} href={(n) => hrefPagina(n, consulta)} onIr={(n) => { setPagina(n); irParaPagina(n, consulta); }} />
      {!carregando && visiveis.length === 0 ? <p className="catalogo-vazio">Não encontramos medicamentos com esse nome. Fale com a loja pelo WhatsApp.</p> : null}
    </section>
  );
}
