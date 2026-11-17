"use client";

import { useEffect, useMemo, useState } from "react";
import PainelBanners from "../shop/PainelBanners";
import { buscaPadraoDaArte, hrefBusca, type BannerPainel } from "../shop/painel-banners";
import { MAX_ARQUIVO_TEXTO, MAX_TERMO_BUSCA, normalizarTermoBusca } from "../banners-gravacao";
import { mensagemErroEnvio, prepararArte } from "./preparar-arte";
import { carregarBuscaIndex } from "../nacoes-unidas/produtos/busca-index";

type ProdutoBusca = { slug: string; nome: string; lab: string };

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Termo de busca do banner: o clique no site leva para a busca do catálogo com esse termo (ex.: "Personal Baby").
 * Vazio = usa o termo padrão da arte (quando existe) ou o produto escolhido abaixo.
 */
function TermoBusca({ id, busca, url, aoSalvar }: { id: string; busca: string | null; url: string; aoSalvar: (id: string, busca: string) => void }) {
  const numero = id.replace("hero-", "");
  const [texto, setTexto] = useState(busca ?? "");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o termo salvo chega depois que a página abre
    setTexto(busca ?? "");
  }, [busca]);
  const padrao = buscaPadraoDaArte(url);
  const vigente = busca || padrao;

  async function salvar() {
    const termo = normalizarTermoBusca(texto);
    setSalvando(true);
    setAviso("");
    const r = await fetch("/api/interno/banners-busca", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, busca: termo }),
    });
    setSalvando(false);
    if (sessaoExpirou(r)) {
      irParaLogin();
      return;
    }
    if (r.ok) {
      aoSalvar(id, termo);
      setAviso(termo ? "Termo salvo." : "Termo apagado.");
    } else {
      setAviso("Não consegui salvar o termo. Use só letras, números e espaço (até " + MAX_TERMO_BUSCA + " letras).");
    }
  }

  return (
    <div className="pm-termo">
      <label>
        <span>Termo de busca do banner {numero}</span>
        <input
          type="text"
          value={texto}
          maxLength={MAX_TERMO_BUSCA}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void salvar();
          }}
          placeholder={padrao ? `Padrão da arte: ${padrao}` : "Ex.: Personal Baby"}
        />
      </label>
      <button type="button" disabled={salvando} onClick={() => void salvar()}>
        Salvar termo
      </button>
      <p className="pm-termo-dica">
        {vigente ? (
          <>
            Clique no banner abre a busca:{" "}
            <a href={hrefBusca(vigente)} target="_blank" rel="noreferrer">
              {vigente}
            </a>
            {busca ? null : " (padrão da arte)"}
          </>
        ) : (
          "Sem termo: o banner leva para o produto escolhido abaixo ou para o catálogo."
        )}
      </p>
      {aviso ? <p role="status">{aviso}</p> : null}
    </div>
  );
}

/** Busca de produto para um banner: digita o nome, escolhe um resultado e o destino é salvo na hora. */
function BuscaProduto({ id, slug, aoSalvar }: { id: string; slug: string | null; aoSalvar: (id: string, slug: string) => void }) {
  const numero = id.replace("hero-", "");
  const [termo, setTermo] = useState("");
  const [produtos, setProdutos] = useState<ProdutoBusca[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarBuscaIndex()
      .then((ix) =>
        setProdutos(
          ix.grupos.flatMap((g) =>
            g.itens.filter((i) => i.slug).map((i) => ({ slug: i.slug as string, nome: i.nomeExibicao ?? i.nome ?? (i.slug as string), lab: i.lab })),
          ),
        ),
      )
      .catch(() => setErro("Não consegui carregar a lista de produtos."));
  }, []);

  const t = normalizar(termo);
  const achados = t.length >= 2 ? produtos.filter((p) => normalizar(p.nome).includes(t)).slice(0, 8) : [];
  const atual = produtos.find((p) => p.slug === slug);

  async function escolher(p: ProdutoBusca) {
    setSalvando(true);
    setErro("");
    const r = await fetch("/api/interno/banners-destino", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, slug: p.slug }),
    });
    setSalvando(false);
    if (sessaoExpirou(r)) {
      irParaLogin();
      return;
    }
    if (r.ok) {
      aoSalvar(id, p.slug);
      setTermo("");
    } else {
      setErro("Não consegui salvar o produto deste banner. Tente de novo.");
    }
  }

  return (
    <div className="pm-busca">
      <p className="pm-busca-cab">
        <strong>Banner {numero}</strong>
        {slug ? <> · leva para: {atual ? atual.nome : slug}</> : <> · sem produto</>}
      </p>
      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Buscar produto pelo nome (ex.: cimegripe)"
        aria-label={`Buscar produto para o banner ${numero}`}
      />
      {achados.length ? (
        <ul className="pm-busca-lista">
          {achados.map((p) => (
            <li key={p.slug}>
              <button type="button" disabled={salvando} onClick={() => void escolher(p)}>
                {p.nome} <span>{p.lab}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {erro ? <p role="status">{erro}</p> : null}
    </div>
  );
}

const BANNERS_PRINCIPAIS = Array.from({ length: 14 }, (_, i) => ({
  id: `hero-${i + 1}`,
  nome: `Banner ${i + 1}`,
  descricao: "Carrossel principal",
}));

type Banner = { id: string; url: string };

// Sem login, a API interna manda para a tela de entrar; o fetch segue o redirecionamento e recebe HTML com status 200.
function sessaoExpirou(r: Response) {
  return r.redirected || (r.headers.get("content-type") ?? "").includes("text/html");
}

function irParaLogin() {
  window.location.href = "/interno/entrar?next=%2Finterno%2Fpromocoes";
}

export default function PainelPromocoes() {
  const [aviso, setAviso] = useState("");
  const [atuais, setAtuais] = useState<Banner[]>([]);
  const [destinos, setDestinos] = useState<Record<string, string>>({});
  const [buscas, setBuscas] = useState<Record<string, string>>({});

  // Produto atual de cada banner (o site já mostra esse mesmo destino).
  useEffect(() => {
    fetch("/api/banners-publico", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { banners?: { id: string; slug?: string | null; busca?: string | null }[] }) => {
        const mapa: Record<string, string> = {};
        const termos: Record<string, string> = {};
        for (const b of d.banners ?? []) {
          if (b.slug) mapa[b.id] = b.slug;
          if (b.busca) termos[b.id] = b.busca;
        }
        setDestinos(mapa);
        setBuscas(termos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/interno/banners", { cache: "no-store" })
      .then((r) => {
        if (sessaoExpirou(r)) {
          irParaLogin();
          return {};
        }
        return r.json();
      })
      .then((d: { banners?: Banner[] }) => setAtuais(d.banners ?? []))
      .catch(() => {});
  }, []);

  // Prévia editável: o mesmo carrossel da home, com as 14 vagas na ordem. Tocar numa vaga envia ou troca a arte dela.
  // (No site só aparecem as vagas que têm arte; as vazias ficam de fora.)
  const previa = useMemo<BannerPainel[]>(
    () =>
      BANNERS_PRINCIPAIS.map((b) => {
        const atual = atuais.find((a) => a.id === b.id);
        return atual ? { id: b.id, imagem: atual.url, alt: "Oferta da União Farma" } : { id: b.id, alt: `${b.nome} (sem arte)` };
      }),
    [atuais],
  );

  async function enviar(id: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setAviso("Preparando a arte...");
    const arte = await prepararArte(arquivo);
    if (!arte.ok) {
      setAviso(arte.mensagem);
      return;
    }
    const url = arte.url;
    setAviso(arte.reduzida ? "A arte era grande; diminuí para caber. Enviando..." : "Enviando...");
    const r = await fetch("/api/interno/banners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, url }),
    });
    if (sessaoExpirou(r)) {
      setAviso("Sua sessão expirou. Entre de novo para enviar a arte.");
      irParaLogin();
      return;
    }
    if (r.ok) {
      setAviso("Arte enviada.");
      setAtuais((prev) => [...prev.filter((b) => b.id !== id), { id, url }]);
    } else {
      setAviso(await mensagemErroEnvio(r));
    }
  }

  return (
    <section className="pm-pagina">
      <header className="pm-cabeca">
        <h1>Promoções</h1>
        <p>É o carrossel da página inicial, do jeito que o cliente vê. Toque num banner para enviar ou trocar a arte dele e use as setas para ver os {BANNERS_PRINCIPAIS.length}. No site só aparecem os banners que têm arte. Tamanho máximo de cada arte: {MAX_ARQUIVO_TEXTO} (se passar, o painel tenta diminuir sozinho).</p>
      </header>
      {aviso ? <p className="pm-aviso" role="status">{aviso}</p> : null}
      <section className="pm-previa" aria-label="Carrossel da página inicial">
        <PainelBanners fonte={previa} aoEnviar={(b, arquivo) => void enviar(b.id, arquivo)} />
      </section>
      {atuais.length ? (
        <section className="pm-destinos" aria-label="Produto de cada banner">
          <h2>Para onde cada banner leva</h2>
          <p>Escreva o termo de busca (ex.: Personal Baby): o clique no banner abre a busca do catálogo com ele. Sem termo, vale o produto escolhido (página do produto).</p>
          {[...atuais]
            .filter((b) => b.id.startsWith("hero-"))
            .sort((a, b) => (Number(a.id.replace("hero-", "")) || 0) - (Number(b.id.replace("hero-", "")) || 0))
            .map((b) => (
              <div className="pm-destino" key={b.id}>
                <TermoBusca id={b.id} url={b.url} busca={buscas[b.id] ?? null} aoSalvar={(id, termo) => setBuscas((prev) => ({ ...prev, [id]: termo }))} />
                <BuscaProduto id={b.id} slug={destinos[b.id] ?? null} aoSalvar={(id, slug) => setDestinos((prev) => ({ ...prev, [id]: slug }))} />
              </div>
            ))}
        </section>
      ) : null}
    </section>
  );
}
