import { banco } from "../../../estoque-fonte";
import { carregarCatalogoCompleto } from "../../../nacoes-unidas/produtos/catalogo";
import {
  adicionarFotoColecao,
  listarColecao,
  lerFotoColecao,
  moverFotoColecao,
  removerFotoColecao,
  MAX_FOTOS_COLECAO,
} from "../../../colecoes-fotos";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };

type Banco = Parameters<typeof listarColecao>[0];

function semBanco() {
  return Response.json({ ok: false, erro: "sem_banco" }, { status: 503, headers: SEM_CACHE });
}

/**
 * GET ?busca=texto → produtos do catálogo (nome e EAN), até 20.
 * GET ?ean=... → fotos da coleção desse produto.
 * GET ?ean=...&ordem=N&imagem=1 → a própria foto (usada nas miniaturas do painel).
 * (A senha da equipe é pedida pelo middleware de /interno e /api/interno.)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ean = url.searchParams.get("ean");
  const busca = (url.searchParams.get("busca") ?? "").trim().toLowerCase();
  const db = banco() as Banco | null;

  if (ean) {
    if (!db) return semBanco();
    const ordem = Number(url.searchParams.get("ordem") ?? 0);
    if (url.searchParams.get("imagem") === "1" && ordem > 0) {
      const foto = await lerFotoColecao(db, ean, ordem);
      if (!foto) return new Response(null, { status: 404, headers: SEM_CACHE });
      const bytes = Uint8Array.from(atob(foto.base64), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { "content-type": foto.mime, ...SEM_CACHE } });
    }
    const fotos = await listarColecao(db, ean);
    return Response.json({ ok: true, ean, max: MAX_FOTOS_COLECAO, fotos }, { headers: SEM_CACHE });
  }

  if (busca.length < 2) return Response.json({ ok: true, produtos: [] }, { headers: SEM_CACHE });
  const produtos = carregarCatalogoCompleto()
    .itens.filter((i) => i.ean && (i.nome.toLowerCase().includes(busca) || i.ean.includes(busca)))
    .slice(0, 20)
    .map((i) => ({ nome: i.nome, ean: i.ean, categoria: i.categoria }));
  return Response.json({ ok: true, produtos }, { headers: SEM_CACHE });
}

/** POST { acao: "adicionar", ean, imagem } | { acao: "remover", ean, ordem } | { acao: "mover", ean, ordem, direcao } */
export async function POST(request: Request) {
  const db = banco() as Banco | null;
  if (!db) return semBanco();
  let corpo: { acao?: string; ean?: string; imagem?: string; ordem?: number; direcao?: number };
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "corpo_invalido" }, { status: 400, headers: SEM_CACHE });
  }
  const ean = typeof corpo.ean === "string" ? corpo.ean : "";
  if (!/^\d{8,14}$/.test(ean)) return Response.json({ ok: false, erro: "ean_invalido" }, { status: 400, headers: SEM_CACHE });

  if (corpo.acao === "adicionar") {
    const r = await adicionarFotoColecao(db, ean, corpo.imagem ?? "");
    return Response.json(r, { status: r.ok ? 200 : 422, headers: SEM_CACHE });
  }
  if (corpo.acao === "remover" && typeof corpo.ordem === "number") {
    await removerFotoColecao(db, ean, corpo.ordem);
    return Response.json({ ok: true, fotos: await listarColecao(db, ean) }, { headers: SEM_CACHE });
  }
  if (corpo.acao === "mover" && typeof corpo.ordem === "number" && (corpo.direcao === -1 || corpo.direcao === 1)) {
    await moverFotoColecao(db, ean, corpo.ordem, corpo.direcao);
    return Response.json({ ok: true, fotos: await listarColecao(db, ean) }, { headers: SEM_CACHE });
  }
  return Response.json({ ok: false, erro: "acao_invalida" }, { status: 400, headers: SEM_CACHE });
}
