"use client";

import SemFoto from "../nacoes-unidas/produtos/SemFoto";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../analytics";
import { registrarEtapa } from "../funil";
import { sugestoesDaCesta, type Pares } from "../nacoes-unidas/produtos/relacionados";
import { IconMais } from "./ReservaIcons";
import { adicionar, atualizarReserva, formatarCentavos, type ReservaItem } from "./reserva-store";

type ProdutoBusca = { nome: string; slug: string; precoCentavos: number; foto: string | null };
type Dados = { pares: Pares; porNome: Map<string, ProdutoBusca>; porSlug: Map<string, ProdutoBusca> };

const chaveDoNome = (nome: string) => nome.replace(/\s+/g, " ").trim().toLowerCase();

let emMemoria: Promise<Dados | null> | null = null;

/** Carrega sob demanda (só quando a cesta tem item): os pares prontos e o catálogo enxuto da busca. Falha em silêncio. */
function carregarDados(): Promise<Dados | null> {
  emMemoria ??= Promise.all([
    import("../nacoes-unidas/produtos/dados/relacionados-ia.json"),
    fetch("/dados/nacoes/catalogo-busca.json", { headers: { accept: "application/json" } }).then((r) => (r.ok ? (r.json() as Promise<ProdutoBusca[]>) : Promise.reject(new Error("catalogo")))),
  ])
    .then(([modulo, catalogo]) => {
      const pares = ((modulo as { default?: unknown }).default ?? modulo) as Pares;
      const porNome = new Map<string, ProdutoBusca>();
      const porSlug = new Map<string, ProdutoBusca>();
      for (const p of Array.isArray(catalogo) ? catalogo : []) {
        if (!p || typeof p.nome !== "string" || typeof p.slug !== "string" || !(p.precoCentavos > 0)) continue;
        if (!porNome.has(chaveDoNome(p.nome))) porNome.set(chaveDoNome(p.nome), p);
        if (!porSlug.has(p.slug)) porSlug.set(p.slug, p);
      }
      return { pares, porNome, porSlug };
    })
    .catch(() => {
      emMemoria = null;
      return null;
    });
  return emMemoria;
}

/**
 * "Leve também": sugestões do catálogo ligadas aos itens da cesta. Não afirma nada sobre compras de outros clientes: não há histórico.
 * Medicamentos (com ou sem receita) nunca geram nem entram como sugestão, e item com receita é ignorado.
 */
export default function CestaSugestoes({ itens, max = 3, variante }: { itens: readonly ReservaItem[]; max?: number; variante: "gaveta" | "pagina" }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const temItens = itens.length > 0;

  useEffect(() => {
    if (!temItens) return;
    let vivo = true;
    carregarDados().then((d) => {
      if (vivo && d) setDados(d);
    });
    return () => {
      vivo = false;
    };
  }, [temItens]);

  const chave = itens.map((i) => i.id).join("|");
  const sugestoes = useMemo(() => {
    if (!dados) return [];
    const slugs = itens
      .filter((i) => !i.receita)
      .map((i) => dados.porNome.get(chaveDoNome(i.nome))?.slug)
      .filter((s): s is string => !!s);
    const todosNaCesta = itens.map((i) => dados.porNome.get(chaveDoNome(i.nome))?.slug).filter((s): s is string => !!s);
    const base = sugestoesDaCesta(dados.pares, slugs, 12).filter((s) => !todosNaCesta.includes(s));
    const itensDaLoja = base.map((s) => dados.porSlug.get(s)).filter((p): p is ProdutoBusca => !!p);
    return itensDaLoja.length >= 3 ? itensDaLoja.slice(0, max) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave resume os itens da cesta
  }, [dados, chave, max]);

  if (sugestoes.length < 3) return null;
  return (
    <section className={`cesta-sugestoes cesta-sugestoes-${variante}`} aria-labelledby={`cesta-sugestoes-titulo-${variante}`}>
      <h3 id={`cesta-sugestoes-titulo-${variante}`}>Leve também</h3>
      <p className="cesta-sugestoes-nota">Sugestões da loja que combinam com a sua cesta.</p>
      <ul>
        {sugestoes.map((p) => (
          <li key={p.slug}>
            {p.foto ? <img src={p.foto} alt="" width="48" height="48" loading="lazy" decoding="async" /> : <SemFoto className="cesta-sugestao-sem-foto" />}
            <div className="cesta-sugestao-info">
              <a href={`/nacoes-unidas/produtos/${p.slug}`} className="cesta-sugestao-nome">{p.nome}</a>
              <strong>{formatarCentavos(p.precoCentavos)}</strong>
            </div>
            <button
              type="button"
              className="cesta-sugestao-add"
              aria-label={`Adicionar ${p.nome} à cesta`}
              onClick={() => {
                atualizarReserva((s) => adicionar(s, { unitId: "nacoes", nome: p.nome, precoCentavos: p.precoCentavos, foto: p.foto }));
                trackEvent("reserva_add", { unit: "nacoes", source: "leve_tambem" });
                registrarEtapa("add");
              }}
            >
              <IconMais size={20} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
