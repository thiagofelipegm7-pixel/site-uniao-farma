"use client";

import { useEffect, useState } from "react";
import "../metrics-polish.css";
import "./painel-inicio.css";

type Alertas = {
  pc: { online: boolean; texto: string } | null;
  estoque: { esgotado: number; acabando: number; baixo: number } | null;
  fila: number | null;
  erros: number | null;
};

async function ler<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (r.redirected || (r.headers.get("content-type") ?? "").includes("text/html")) {
      window.location.assign("/interno/entrar?next=%2Finterno");
      return null;
    }
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Tela inicial da equipe: as 3 tarefas principais (atender, corrigir, ver alertas) em uma tela só. */
export default function PainelInicio() {
  const [busca, setBusca] = useState("");
  const [a, setA] = useState<Alertas>({ pc: null, estoque: null, fila: null, erros: null });

  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [est, cat, rev, err] = await Promise.all([
        ler<{ ok: boolean; pc?: { idadeHoras: number | null; parado: boolean }; totais?: { esgotado: number; acabando: number; baixo: number } }>("/api/interno/estoque"),
        ler<{ pc?: { online: boolean; idadeBatimentoHoras: number | null } | null }>("/api/interno/catalogo"),
        ler<{ itens?: unknown[] }>("/api/interno/revisao"),
        ler<{ erros?: { dia: string; n: number }[] }>("/api/interno/erros"),
      ]);
      if (!vivo) return;
      const idade = est?.pc?.idadeHoras ?? cat?.pc?.idadeBatimentoHoras ?? null;
      const parado = est?.pc?.parado ?? (cat?.pc ? !cat.pc.online : null);
      const hoje = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
      setA({
        pc: parado === null && idade === null ? null : { online: parado === false, texto: idade === null ? "sem informação" : idade < 1 ? `última conversa há ${Math.max(1, Math.round(idade * 60))} min` : `última conversa há ${String(Math.round(idade * 10) / 10).replace(".", ",")} h` },
        estoque: est?.totais ?? null,
        fila: Array.isArray(rev?.itens) ? rev.itens.length : null,
        erros: err?.erros ? err.erros.filter((e) => e.dia === hoje).reduce((s, e) => s + e.n, 0) : null,
      });
    })();
    return () => {
      vivo = false;
    };
  }, []);

  function procurar(e: React.FormEvent) {
    e.preventDefault();
    const q = busca.trim();
    window.location.assign(q ? `/interno/fotos?q=${encodeURIComponent(q)}` : "/interno/fotos");
  }

  const pcClasse = a.pc === null ? "pi-neutro" : a.pc.online ? "pi-ok" : "pi-alerta";
  return (
    <section className="painel-inicio">
      <h1>Área interna</h1>
      <p className="pi-lead">As três coisas que a equipe faz, em uma tela só.</p>

      <div className="pi-grade">
        <article className="pi-cartao" aria-labelledby="pi-corrigir">
          <h2 id="pi-corrigir">Corrigir um produto</h2>
          <p>Ache pelo nome ou pelo código de barras e troque o nome, a foto ou tire a foto errada.</p>
          <form onSubmit={procurar} className="pi-busca" role="search">
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou código de barras" aria-label="Buscar produto para corrigir" />
            <button type="submit" className="pi-acao">Achar</button>
          </form>
        </article>

        <article className="pi-cartao" aria-labelledby="pi-atender">
          <h2 id="pi-atender">Atender um pedido</h2>
          <p>O pedido chega pronto, escrito, na conversa do WhatsApp da loja. Confirme preço e estoque com o cliente e separe o item na hora.</p>
          <a className="pi-acao" href="https://web.whatsapp.com/" target="_blank" rel="noreferrer">Abrir o WhatsApp Web</a>
        </article>

        <article className="pi-cartao pi-largo" aria-labelledby="pi-alertas">
          <h2 id="pi-alertas">Alertas</h2>
          <ul className="pi-alertas">
            <li className={pcClasse}>
              <strong>PC da loja</strong>
              <span>{a.pc === null ? "carregando…" : `${a.pc.online ? "enviando o estoque" : "PARADO"}: ${a.pc.texto}`}</span>
              <a href="/interno/catalogo">Ver sincronização</a>
            </li>
            <li className={a.estoque === null ? "pi-neutro" : a.estoque.esgotado + a.estoque.acabando > 0 ? "pi-alerta" : "pi-ok"}>
              <strong>Estoque</strong>
              <span>{a.estoque === null ? "carregando…" : `${a.estoque.esgotado} acabaram · ${a.estoque.acabando} vão acabar · ${a.estoque.baixo} com estoque baixo`}</span>
              <a href="/interno/estoque">Ver alertas</a>
            </li>
            <li className={a.fila === null ? "pi-neutro" : a.fila > 0 ? "pi-alerta" : "pi-ok"}>
              <strong>Fila de revisão</strong>
              <span>{a.fila === null ? "carregando…" : a.fila === 0 ? "nada esperando" : `${a.fila} ${a.fila === 1 ? "produto espera" : "produtos esperam"} uma conferência`}</span>
              <a href="/interno/revisao">Abrir a fila</a>
            </li>
            <li className={a.erros === null ? "pi-neutro" : a.erros > 0 ? "pi-alerta" : "pi-ok"}>
              <strong>Erros no celular dos clientes</strong>
              <span>{a.erros === null ? "carregando…" : a.erros === 0 ? "nenhum hoje" : `${a.erros} hoje`}</span>
              <a href="/interno/erros">Ver erros</a>
            </li>
          </ul>
        </article>
      </div>
    </section>
  );
}
