"use client";

import { useEffect, useState } from "react";
import { carregarBuscaIndex } from "../nacoes-unidas/produtos/busca-index";
import { formatarCentavos } from "../reserva/reserva-store";
import type { PromocaoQuantidade } from "../promocao-quantidade-tipos";
import "./painel-leve-pague.css";

type Produto = { slug: string; nome: string; preco: number; isMIP: boolean; categoria?: string };
type Linha = { slug: string; quantidade: string; preco: string };
const idNovo = () => `linha-${Math.random().toString(36).slice(2)}`;

export default function PainelLevePague({ nivel = 1 }: { /** 1 = h1 (página própria); 2 = h2 (dentro de uma aba). */ nivel?: 1 | 2 } = {}) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [linhas, setLinhas] = useState<Array<Linha & { id: string }>>([]);
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void Promise.all([
      carregarBuscaIndex(),
      fetch("/api/interno/promocoes-quantidade", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
    ]).then(([indice, dados]) => {
      const slugsControlados = new Set(indice.restritos.filter((item) => item.tipo === "controlados").map((item) => item.slug));
      const lista = indice.grupos.flatMap((grupo) => grupo.itens.flatMap((item) => item.slug && typeof item.preco === "number" && !(grupo.categoria === "Medicamentos" && slugsControlados.has(item.slug)) ? [{ slug: item.slug, nome: item.nomeExibicao ?? item.nome ?? item.slug, preco: item.preco, isMIP: item.isMIP, categoria: grupo.categoria }] : []));
      const medicamentosComReceita = indice.restritos.flatMap((item) => item.tipo === "receita" && !item.controlado && !item.esgotado && item.slug && typeof item.preco === "number"
        ? [{ slug: item.slug, nome: item.nomeExibicao ?? item.nome, preco: item.preco, isMIP: false, categoria: "Medicamentos" }]
        : []);
      setProdutos([...lista, ...medicamentosComReceita]);
      setLinhas((dados.promocoes as PromocaoQuantidade[]).map((p) => ({ id: idNovo(), slug: p.slug, quantidade: String(p.quantidade), preco: (p.precoUnitarioCentavos / 100).toFixed(2) })));
    }).catch(() => setAviso("Não consegui carregar os produtos e promoções. Atualize a página."));
  }, []);

  const porSlug = new Map(produtos.map((p) => [p.slug, p]));
  async function salvar() {
    const preenchidas = linhas.filter((l) => l.slug || l.quantidade || l.preco);
    const payload = preenchidas.map((l) => ({ slug: l.slug, quantidade: Number(l.quantidade), precoUnitarioCentavos: Math.round(Number(l.preco) * 100) }));
    setOcupado(true);
    setAviso("");
    try {
      const resposta = await fetch("/api/interno/promocoes-quantidade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ promocoes: payload }) });
      const dados = await resposta.json() as { ok?: boolean; erro?: string };
      setAviso(resposta.ok && dados.ok ? "Promoções salvas e publicadas." : dados.erro ?? "Não consegui salvar as promoções.");
    } catch {
      setAviso("Sem conexão. Tente salvar novamente.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="painel-leve-pague" aria-labelledby="leve-pague-titulo">
      {nivel === 2 ? <h2 id="leve-pague-titulo">Leve mais e pague menos</h2> : <h1 id="leve-pague-titulo">Leve mais e pague menos</h1>}
      <p>Escolha os produtos, a quantidade mínima e o preço de cada unidade na promoção. O preço normal continua valendo para quantidades menores.</p>
      <p className="painel-leve-pague__nota">Medicamentos controlados ficam fora. Medicamentos sob prescrição não controlados podem ser selecionados.</p>
      {linhas.map((linha) => {
        const produto = porSlug.get(linha.slug);
        return (
          <div className="painel-leve-pague__linha" key={linha.id}>
            <label>Produto
              <select value={linha.slug} onChange={(e) => setLinhas((atuais) => atuais.map((x) => x.id === linha.id ? { ...x, slug: e.target.value } : x))}>
                <option value="">Selecione um produto</option>
                {produtos.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}
              </select>
            </label>
            <label>Leve
              <input type="number" min="2" max="20" step="1" value={linha.quantidade} onChange={(e) => setLinhas((atuais) => atuais.map((x) => x.id === linha.id ? { ...x, quantidade: e.target.value } : x))} />
            </label>
            <label>Pague por unidade
              <input type="number" min="0.01" step="0.01" value={linha.preco} onChange={(e) => setLinhas((atuais) => atuais.map((x) => x.id === linha.id ? { ...x, preco: e.target.value } : x))} />
            </label>
            {produto ? <p className="painel-leve-pague__preco">Preço normal {formatarCentavos(Math.round(produto.preco * 100))}</p> : null}
            <button type="button" className="painel-leve-pague__remover" onClick={() => setLinhas((atuais) => atuais.filter((x) => x.id !== linha.id))}>Remover</button>
          </div>
        );
      })}
      <div className="painel-leve-pague__acoes">
        <button type="button" onClick={() => setLinhas((atuais) => [...atuais, { id: idNovo(), slug: "", quantidade: "", preco: "" }])}>Adicionar produto à promoção</button>
        <button type="button" disabled={ocupado} onClick={() => void salvar()}>{ocupado ? "Salvando…" : "Salvar promoções"}</button>
      </div>
      {aviso ? <p className="painel-leve-pague__aviso" role="status">{aviso}</p> : null}
    </section>
  );
}
