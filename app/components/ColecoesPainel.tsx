"use client";

import { useEffect, useState, type DragEvent } from "react";

type Produto = { nome: string; ean: string; categoria: string };
type Foto = { ordem: number; mime: string; criadoEm: string };

const MAX = 6;
const ERROS: Record<string, string> = {
  limite_de_fotos: `Este produto já tem ${MAX} fotos. Remova uma para enviar outra.`,
  imagem_muito_grande: "Foto grande demais. Envie uma imagem de até cerca de 450 KB (WebP ou JPG comprimido).",
  formato_nao_aceito: "Formato não aceito. Use WebP, PNG ou JPG.",
  imagem_invalida: "Não consegui ler esse arquivo.",
  ean_invalido: "Este produto não tem código de barras válido.",
};

function mensagem(erro: string | undefined): string {
  return (erro && ERROS[erro]) || "Não foi possível salvar. Tente de novo.";
}

/** Lê o arquivo escolhido como base64 (sem o prefixo data:). */
function lerComoBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => reject(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

/** Fotos extras de um produto dentro do cartão de configuração: lista, remove e adiciona (até MAX). Mesma API da aba Coleções. */
export function FotosExtras({ ean, nome }: { ean: string; nome: string }) {
  const [fotos, setFotos] = useState<Foto[] | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  /** Cards vazios abertos pelo "+", esperando uma foto (clique ou arraste). */
  const [vagas, setVagas] = useState(0);

  useEffect(() => {
    let vivo = true;
    setVagas(0);
    setFotos(null);
    setAviso(null);
    fetch(`/api/interno/colecoes?ean=${ean}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { fotos?: Foto[] }) => { if (vivo) setFotos(d.fotos ?? []); })
      .catch(() => { if (vivo) setFotos([]); });
    return () => { vivo = false; };
  }, [ean]);

  async function enviar(api: Record<string, unknown>): Promise<boolean> {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fetch("/api/interno/colecoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ean, ...api }),
      });
      const d = (await r.json()) as { ok?: boolean; erro?: string; fotos?: Foto[] };
      if (!r.ok || !d.ok) {
        setAviso(mensagem(d.erro));
        return false;
      }
      // Recarrega a lista: a resposta do envio nem sempre traz as fotos.
      const atual = (await (await fetch(`/api/interno/colecoes?ean=${ean}`, { cache: "no-store" })).json()) as { fotos?: Foto[] };
      setFotos(atual.fotos ?? d.fotos ?? []);
      return true;
    } catch {
      setAviso("Sem conexão. Tente de novo.");
      return false;
    } finally {
      setOcupado(false);
    }
  }

  /** Envia a foto e, se deu certo, fecha um card vazio (se houver). */
  async function adicionar(arquivo: File | undefined) {
    if (!arquivo) return;
    const imagem = await lerComoBase64(arquivo);
    const ok = await enviar({ acao: "adicionar", imagem });
    if (ok) setVagas((v) => Math.max(0, v - 1));
  }

  const lista = fotos ?? [];
  const podeAdicionar = lista.length + vagas < MAX && fotos !== null && !ocupado;

  /** Arrastar uma imagem para a área já envia: não precisa abrir o seletor. */
  function soltar(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setArrastando(false);
    if (!podeAdicionar) return;
    const arquivo = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (arquivo) void adicionar(arquivo);
    else setAviso("Solte uma imagem (WebP, PNG ou JPG).");
  }

  return (
    <section
      className={`pf-campo colecoes-extras${arrastando ? " colecoes-extras--arrastando" : ""}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); if (!arrastando) setArrastando(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastando(false); }}
      onDrop={soltar}
    >
      <span className="pf-campo-rotulo">Fotos extras · {lista.length} de {MAX}</span>
      {lista.length > 0 || vagas > 0 ? (
        <ol className="colecoes-extras-lista">
          {lista.map((f, i) => (
            <li key={f.ordem}>
              <img src={`/api/interno/colecoes?ean=${ean}&ordem=${f.ordem}&imagem=1`} alt={`Foto extra ${i + 1} de ${nome}`} width={64} height={64} loading="lazy" />
              <button type="button" className="colecoes-remover" disabled={ocupado} onClick={() => enviar({ acao: "remover", ordem: f.ordem })}>Remover</button>
            </li>
          ))}
        </ol>
      ) : null}
      {Array.from({ length: vagas }, (_, i) => (
        <label key={`vaga-${i}`} className="colecoes-vaga">
          <input type="file" accept="image/webp,image/png,image/jpeg" disabled={ocupado} onChange={(e) => { void adicionar(e.target.files?.[0]); e.target.value = ""; }} />
          <span className="colecoes-vaga-icone" aria-hidden="true">+</span>
          <span className="colecoes-vaga-texto">
            <strong>{ocupado ? "Enviando…" : "Adicionar foto"}</strong>
            <small>Clique aqui ou arraste uma imagem para este card. Use WebP, PNG ou JPG, de até cerca de 450 KB.</small>
          </span>
        </label>
      ))}
      {lista.length < MAX ? (
        <button
          type="button"
          className="colecoes-adicionar"
          disabled={ocupado || fotos === null || lista.length + vagas >= MAX}
          onClick={() => setVagas((v) => v + 1)}
          aria-label="Adicionar Foto Extra"
          title="Adicionar Foto Extra"
        >
          +
        </button>
      ) : (
        <small className="colecoes-cheio">Coleção completa ({MAX} fotos). Remova uma para enviar outra.</small>
      )}
      {aviso ? <small className="colecoes-aviso" role="alert">{aviso}</small> : null}
    </section>
  );
}

export default function ColecoesPainel({ nivel = 1 }: { /** 1 = h1 (página própria); 2 = h2 (dentro de uma aba). */ nivel?: 1 | 2 } = {}) {
  const [busca, setBusca] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [escolhido, setEscolhido] = useState<Produto | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Busca de produtos com pequeno atraso, para não pedir a cada tecla.
  useEffect(() => {
    if (busca.trim().length < 2) {
      setProdutos([]);
      return;
    }
    const t = window.setTimeout(() => {
      fetch(`/api/interno/colecoes?busca=${encodeURIComponent(busca.trim())}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { produtos?: Produto[] }) => setProdutos(d.produtos ?? []))
        .catch(() => setProdutos([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [busca]);

  // Carrega a coleção do produto escolhido.
  useEffect(() => {
    if (!escolhido) return;
    fetch(`/api/interno/colecoes?ean=${escolhido.ean}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { fotos?: Foto[] }) => setFotos(d.fotos ?? []))
      .catch(() => setFotos([]));
  }, [escolhido]);

  async function enviar(api: Record<string, unknown>) {
    if (!escolhido) return;
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fetch("/api/interno/colecoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ean: escolhido.ean, ...api }),
      });
      const d = (await r.json()) as { ok?: boolean; erro?: string; fotos?: Foto[] };
      if (!r.ok || !d.ok) setAviso(mensagem(d.erro));
      else if (d.fotos) setFotos(d.fotos);
      else if (api.acao === "adicionar") setFotos((atuais) => [...atuais, { ordem: atuais.length + 1, mime: "", criadoEm: "" }]);
    } catch {
      setAviso("Sem conexão. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  async function escolherArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    const base64 = await lerComoBase64(arquivo);
    await enviar({ acao: "adicionar", imagem: base64 });
    // Recarrega para pegar a ordem e o formato de verdade.
    if (escolhido) {
      const d = (await (await fetch(`/api/interno/colecoes?ean=${escolhido.ean}`, { cache: "no-store" })).json()) as { fotos?: Foto[] };
      setFotos(d.fotos ?? []);
    }
  }

  return (
    <main className="colecoes-painel">
      <header>
        {nivel === 2 ? <h2>Coleções de fotos</h2> : <h1>Coleções de fotos</h1>}
        <p>Fotos extras de cada produto, na ordem da ficha (até {MAX} por produto).</p>
      </header>

      <label className="colecoes-busca">
        <span className="colecoes-sr">Produto</span>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto por nome ou código" />
      </label>

      {produtos.length > 0 ? (
        <ul className="colecoes-resultados">
          {produtos.map((p) => (
            <li key={p.ean}>
              <button type="button" onClick={() => { setEscolhido(p); setBusca(""); setProdutos([]); }}>
                <strong>{p.nome}</strong>
                <small>{p.ean} · {p.categoria}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {escolhido ? (
        <section className="colecoes-produto" aria-live="polite">
          <h2>{escolhido.nome}</h2>
          <p className="colecoes-ean">EAN {escolhido.ean}</p>

          <ol className="colecoes-fotos">
            {fotos.map((f, i) => (
              <li key={f.ordem}>
                <img src={`/api/interno/colecoes?ean=${escolhido.ean}&ordem=${f.ordem}&imagem=1`} alt={`Foto ${i + 1} de ${escolhido.nome}`} width={120} height={120} />
                <div className="colecoes-acoes">
                  <button type="button" disabled={ocupado || i === 0} onClick={() => enviar({ acao: "mover", ordem: f.ordem, direcao: -1 })} aria-label="Subir">↑</button>
                  <button type="button" disabled={ocupado || i === fotos.length - 1} onClick={() => enviar({ acao: "mover", ordem: f.ordem, direcao: 1 })} aria-label="Descer">↓</button>
                  <button type="button" className="colecoes-remover" disabled={ocupado} onClick={() => enviar({ acao: "remover", ordem: f.ordem })}>Remover</button>
                </div>
              </li>
            ))}
          </ol>

          {fotos.length < MAX ? (
            <label className="colecoes-enviar">
              <span>{ocupado ? "Enviando…" : "Adicionar foto"}</span>
              <input type="file" accept="image/webp,image/png,image/jpeg" disabled={ocupado} onChange={(e) => escolherArquivo(e.target.files?.[0])} />
            </label>
          ) : (
            <p className="colecoes-cheio">Coleção completa ({MAX} fotos). Remova uma para enviar outra.</p>
          )}

          {aviso ? <p className="colecoes-aviso" role="alert">{aviso}</p> : null}
          <p className="colecoes-nota">As fotos aparecem no site depois da sincronização.</p>
        </section>
      ) : null}
    </main>
  );
}
