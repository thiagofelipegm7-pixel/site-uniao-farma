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
  const [buscas, setBuscas] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    void Promise.all([
      carregarBuscaIndex(),
      fetch("/api/interno/promocoes-quantidade", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()),
    ]).then(([indice, dados]) => {
      const lista = indice.grupos.flatMap((grupo) => grupo.itens.flatMap((item) => item.slug && typeof item.preco === "number" ? [{ slug: item.slug, nome: item.nomeExibicao ?? item.nome ?? item.slug, preco: item.preco, isMIP: item.isMIP, categoria: grupo.categoria }] : []));
      const medicamentosRestritos = indice.restritos.flatMap((item) => (item.tipo === "receita" || item.tipo === "controlados") && !item.esgotado && item.slug && typeof item.preco === "number"
        ? [{ slug: item.slug, nome: item.nomeExibicao ?? item.nome, preco: item.preco, isMIP: false, categoria: "Medicamentos" }]
        : []);
      setProdutos([...lista, ...medicamentosRestritos]);
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
      <p className="painel-leve-pague__nota">Todos os medicamentos do catálogo podem ser selecionados. Defina as quantidades e os preços promocionais manualmente.</p>
      {linhas.map((linha) => {
        const produto = porSlug.get(linha.slug);
        const busca = buscas[linha.id] ?? produto?.nome ?? "";
        const termos = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().split(/\s+/).filter(Boolean);
        const resultados = termos.length ? produtos.filter((p) => {
          const nome = p.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
          return termos.every((termo) => nome.includes(termo));
        }).slice(0, 20) : [];
        const mostrarResultados = (buscas[linha.id] ?? "").trim().length > 0;
        return (
          <div className="painel-leve-pague__linha" key={linha.id}>
            <div className="painel-leve-pague__busca">
              <label htmlFor={`produto-busca-${linha.id}`}>Pesquisar produto pelo nome
                <input
                  id={`produto-busca-${linha.id}`}
                  type="search"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={mostrarResultados}
                  aria-controls={`produto-resultados-${linha.id}`}
                  autoComplete="off"
                  placeholder="Digite o nome do produto"
                  value={busca}
                  onChange={(e) => {
                    const valor = e.target.value;
                    setBuscas((atuais) => ({ ...atuais, [linha.id]: valor }));
                    setLinhas((atuais) => atuais.map((x) => x.id === linha.id ? { ...x, slug: "" } : x));
                  }}
                />
              </label>
              {mostrarResultados ? (
                <div id={`produto-resultados-${linha.id}`} className="painel-leve-pague__resultados" role="listbox" aria-label="Produtos encontrados">
                  {resultados.length ? resultados.map((p) => (
                    <button
                      key={p.slug}
                      type="button"
                      role="option"
                      aria-selected={linha.slug === p.slug}
                      onClick={() => {
                        setLinhas((atuais) => atuais.map((x) => x.id === linha.id ? { ...x, slug: p.slug } : x));
                        setBuscas((atuais) => { const prox = { ...atuais }; delete prox[linha.id]; return prox; });
                      }}
                    >{p.nome}</button>
                  )) : <p role="status">Nenhum produto encontrado.</p>}
                  {resultados.length === 20 ? <p>Mostrando os 20 primeiros resultados. Refine a busca.</p> : null}
                </div>
              ) : null}
            </div>
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
