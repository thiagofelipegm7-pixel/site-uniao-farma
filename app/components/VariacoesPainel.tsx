"use client";

import { useEffect, useId, useState } from "react";

type Produto = { nome: string; ean: string; categoria: string; precoCentavos: number };
type Linha = { ean: string; nome: string; rotulo: string };
type Grupo = { eixo: string; itens: Array<Linha & { precoCentavos: number; esgotado: boolean }> };

const MAX = 12;
const EIXOS = ["Tamanho", "Cor", "Sabor", "Voltagem", "Fragrância"];
const EXEMPLO: Record<string, string> = { Tamanho: "Ex.: G", Cor: "Ex.: Azul", Sabor: "Ex.: Morango", Voltagem: "Ex.: 110 V", Fragrância: "Ex.: Lavanda" };
const ERROS: Record<string, string> = {
  variacoes_invalidas: "Escolha de 2 a 12 produtos para o grupo.",
  rotulo_invalido: "Preencha o nome de cada opção (até 24 letras). Ex.: P, M, G ou Azul.",
  rotulo_repetido: "Cada opção precisa de um nome diferente.",
  produto_repetido: "Esse produto já está no grupo.",
  produto_inexistente: "Um dos produtos não está mais no catálogo.",
  produto_fora_do_grupo: "O produto aberto precisa fazer parte do grupo.",
  eixo_invalido: "O tipo da variação deve ter até 24 letras.",
  sem_banco: "O banco de dados não está disponível agora. Tente em instantes.",
};
const reais = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;

/**
 * Variações do produto: liga produtos do catálogo que são o mesmo item em tamanhos ou cores diferentes (ex.: fralda P, M, G, XG).
 * Na página de cada produto do grupo aparece "Tamanho: G" com uma ficha para cada opção, ligada à página daquele produto.
 */
export default function VariacoesPainel({ ean, nome }: { ean: string; nome: string }) {
  const id = useId();
  const [carregado, setCarregado] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [eixo, setEixo] = useState("Tamanho");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Produto[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    setCarregado(false);
    setAtivo(false);
    setBusca("");
    setAchados([]);
    setAviso(null);
    fetch(`/api/interno/variacoes?ean=${ean}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { grupo?: Grupo | null }) => {
        if (!vivo) return;
        if (d.grupo) {
          setAtivo(true);
          setEixo(d.grupo.eixo);
          setLinhas(d.grupo.itens.map((i) => ({ ean: i.ean, nome: i.nome, rotulo: i.rotulo })));
        } else {
          setLinhas([{ ean, nome, rotulo: "" }]);
        }
        setCarregado(true);
      })
      .catch(() => { if (vivo) { setLinhas([{ ean, nome, rotulo: "" }]); setCarregado(true); } });
    return () => { vivo = false; };
  }, [ean, nome]);

  useEffect(() => {
    if (busca.trim().length < 2) return;
    const t = window.setTimeout(() => {
      fetch(`/api/interno/colecoes?busca=${encodeURIComponent(busca.trim())}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { produtos?: Produto[] }) => setAchados(d.produtos ?? []))
        .catch(() => setAchados([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [busca]);

  const jaNoGrupo = new Set(linhas.map((l) => l.ean));
  const sugestoes = busca.trim().length < 2 ? [] : achados.filter((p) => !jaNoGrupo.has(p.ean));

  function mover(indice: number, direcao: -1 | 1) {
    setLinhas((atuais) => {
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= atuais.length) return atuais;
      const copia = [...atuais];
      [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
      return copia;
    });
  }

  async function enviar(corpo: Record<string, unknown>, sucesso: string) {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fetch("/api/interno/variacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ean, ...corpo }) });
      const d = (await r.json()) as { ok?: boolean; erro?: string; grupo?: Grupo | null };
      if (!r.ok || !d.ok) {
        setAviso({ texto: (d.erro && ERROS[d.erro]) || "Não foi possível salvar. Tente de novo.", erro: true });
        return;
      }
      if (d.grupo) {
        setEixo(d.grupo.eixo);
        setLinhas(d.grupo.itens.map((i) => ({ ean: i.ean, nome: i.nome, rotulo: i.rotulo })));
        setAtivo(true);
      } else {
        setAtivo(false);
        setLinhas([{ ean, nome, rotulo: "" }]);
      }
      setAviso({ texto: sucesso, erro: false });
    } catch {
      setAviso({ texto: "Sem conexão. Tente de novo.", erro: true });
    } finally {
      setOcupado(false);
    }
  }

  const pronto = linhas.length >= 2 && linhas.every((l) => l.rotulo.trim().length > 0);

  return (
    <section className="colecoes-apresentacoes variacoes-painel" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`}>Variações do produto (tamanho, cor...)</h3>
      <p>Use quando o mesmo produto tem tamanhos ou cores diferentes, cada um com seu código e estoque. Na página de cada um aparece uma ficha para cada opção, e o cliente passa de uma para outra.</p>
      {!carregado ? <p className="colecoes-nota">Carregando…</p> : null}
      {carregado && !ativo && linhas.length < 2 ? (
        <button type="button" disabled={ocupado} onClick={() => setAtivo(true)}>Configurar variações</button>
      ) : null}
      {carregado && (ativo || linhas.length >= 2) ? (
        <>
          <label>Tipo da variação
            <input type="text" list={`${id}-eixos`} maxLength={24} value={eixo} onChange={(e) => setEixo(e.target.value)} />
            <datalist id={`${id}-eixos`}>{EIXOS.map((e) => <option key={e} value={e} />)}</datalist>
          </label>

          <ol className="variacoes-lista">
            {linhas.map((l, indice) => (
              <li className="variacoes-linha" key={l.ean}>
                <span className="variacoes-nome">{l.nome}{l.ean === ean ? <small> (este produto)</small> : null}</span>
                <label>Nome da opção
                  <input type="text" maxLength={24} value={l.rotulo} placeholder={EXEMPLO[eixo] ?? "Ex.: G"} onChange={(e) => setLinhas((atuais) => atuais.map((x) => (x.ean === l.ean ? { ...x, rotulo: e.target.value } : x)))} />
                </label>
                <span className="variacoes-botoes">
                  <button type="button" disabled={ocupado || indice === 0} onClick={() => mover(indice, -1)} aria-label={`Subir ${l.rotulo || l.nome}`}>↑</button>
                  <button type="button" disabled={ocupado || indice === linhas.length - 1} onClick={() => mover(indice, 1)} aria-label={`Descer ${l.rotulo || l.nome}`}>↓</button>
                  <button type="button" className="colecoes-apresentacao-remover" disabled={ocupado || l.ean === ean} onClick={() => setLinhas((atuais) => atuais.filter((x) => x.ean !== l.ean))} aria-label={`Tirar ${l.rotulo || l.nome} do grupo`}>Tirar</button>
                </span>
              </li>
            ))}
          </ol>

          {linhas.length < MAX ? (
            <>
              <label>Adicionar outro produto ao grupo
                <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); if (e.target.value.trim().length < 2) setAchados([]); }} placeholder="Nome ou código de barras. Ex.: Fralda Pampers G" />
              </label>
              {sugestoes.length > 0 ? (
                <ul className="colecoes-resultados">
                  {sugestoes.map((p) => (
                    <li key={`${p.ean}-${p.nome}`}>
                      <button type="button" onClick={() => { setLinhas((atuais) => [...atuais, { ean: p.ean, nome: p.nome, rotulo: "" }]); setBusca(""); setAchados([]); }}>
                        <strong>{p.nome}</strong>
                        <small>{p.ean} · {reais(p.precoCentavos)}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : <p className="colecoes-nota">Grupo completo ({MAX} produtos).</p>}

          <div className="colecoes-apresentacoes-acoes">
            <button type="button" disabled={ocupado || !pronto} onClick={() => enviar({ acao: "salvar", eixo, itens: linhas.map((l) => ({ ean: l.ean, rotulo: l.rotulo })) }, "Variações salvas. Já aparecem na página de cada produto do grupo.")}>{ocupado ? "Salvando…" : "Salvar variações"}</button>
            {ativo && linhas.length >= 2 ? <button type="button" className="colecoes-apresentacao-remover" disabled={ocupado} onClick={() => enviar({ acao: "remover" }, "Variações desativadas. Cada produto voltou a ter a página independente.")}>Desativar variações</button> : null}
          </div>
          {!pronto ? <p className="colecoes-nota">Para salvar: pelo menos 2 produtos, cada um com o nome da opção preenchido.</p> : null}
        </>
      ) : null}
      {aviso ? <p className={aviso.erro ? "colecoes-aviso" : "colecoes-nota"} role={aviso.erro ? "alert" : "status"}>{aviso.texto}</p> : null}
    </section>
  );
}
