import { gravarPreVenda, MAX_ITENS_PRE_VENDA } from "../../pre-vendas";

export const dynamic = "force-dynamic";

const SEM_CACHE = { "cache-control": "no-store" };
const UNIDADES = new Set(["fatima", "nacoes", "itacolomi"]);

type ItemEntrada = { nome?: unknown; quantidade?: unknown; precoCentavos?: unknown };
type Entrada = {
  requestId?: unknown;
  codigo?: unknown;
  unidade?: unknown;
  modo?: unknown;
  itens?: unknown;
};

/** Grava só um resumo da cesta quando o cliente abre o WhatsApp. Sem nome, telefone, endereço ou pagamento. */
export async function POST(request: Request) {
  const tamanho = Number(request.headers.get("content-length") || 0);
  if (tamanho > 16_000) return Response.json({ ok: false, erro: "pedido_grande" }, { status: 413, headers: SEM_CACHE });

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
    } catch {
      return Response.json({ ok: false, erro: "origem_invalida" }, { status: 403, headers: SEM_CACHE });
    }
  }

  const entrada = (await request.json().catch(() => null)) as Entrada | null;
  if (!entrada || typeof entrada !== "object") return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  const requestId = typeof entrada.requestId === "string" ? entrada.requestId.trim() : "";
  const codigo = typeof entrada.codigo === "string" ? entrada.codigo.trim().toUpperCase() : "";
  const unidade = typeof entrada.unidade === "string" ? entrada.unidade : "";
  const modo = typeof entrada.modo === "string" ? entrada.modo : "";
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !/^[A-Z0-9]{4}$/.test(codigo) || !UNIDADES.has(unidade) || (modo !== "retirar" && modo !== "casa") || !Array.isArray(entrada.itens) || entrada.itens.length < 1 || entrada.itens.length > MAX_ITENS_PRE_VENDA) {
    return Response.json({ ok: false, erro: "pedido_invalido" }, { status: 400, headers: SEM_CACHE });
  }

  const itens: Array<{ nome: string; quantidade: number; precoCentavos: number }> = [];
  for (const valor of entrada.itens as ItemEntrada[]) {
    const nome = typeof valor?.nome === "string" ? valor.nome.replace(/\s+/g, " ").trim().slice(0, 180) : "";
    const quantidade = valor?.quantidade;
    const precoCentavos = valor?.precoCentavos;
    if (!nome || !Number.isInteger(quantidade) || Number(quantidade) < 1 || Number(quantidade) > 20 || !Number.isInteger(precoCentavos) || Number(precoCentavos) < 1 || Number(precoCentavos) > 10_000_000) {
      return Response.json({ ok: false, erro: "item_invalido" }, { status: 400, headers: SEM_CACHE });
    }
    itens.push({ nome, quantidade: Number(quantidade), precoCentavos: Number(precoCentavos) });
  }
  const total = itens.reduce((soma, item) => soma + item.precoCentavos * item.quantidade, 0);
  if (!Number.isSafeInteger(total) || total > 500_000_000) return Response.json({ ok: false, erro: "total_invalido" }, { status: 400, headers: SEM_CACHE });

  const erro = await gravarPreVenda({ requestId, codigo, unidade, modo, itens });
  if (erro) return Response.json({ ok: false, erro }, { status: 503, headers: SEM_CACHE });
  return Response.json({ ok: true }, { status: 201, headers: SEM_CACHE });
}
