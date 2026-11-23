import { bairrosAndroid, catalogoAndroid, unidadeAndroid } from "../../../android-catalogo";
import { gravarPreVenda, MAX_ITENS_PRE_VENDA } from "../../../pre-vendas";
import { mensagemReserva, taxaDoBairro, type ReservaItem } from "../../../reserva/reserva-store";
import { buildWhatsAppUrl } from "../../../site-config";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store" };
const formatoUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_BYTES = 16_000;
// Mesmo alfabeto do código de pedido do site (sem 0/O, 1/I/L).
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Código determinístico a partir do requestId: repetir o pedido devolve o mesmo código. */
function codigoDoPedido(bytes: Uint8Array) {
  return Array.from(bytes, (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
}

function falha(erro: string, status: number) {
  return Response.json({ erro }, { status, headers });
}

async function lerCorpo(request: Request) {
  if (!request.body) return "";
  const stream = request.body.getReader();
  const decoder = new TextDecoder();
  let texto = "";
  let tamanho = 0;
  try {
    for (;;) {
      const { value, done } = await stream.read();
      if (done) return texto + decoder.decode();
      tamanho += value.byteLength;
      if (tamanho > MAX_BYTES) {
        await stream.cancel();
        return null;
      }
      texto += decoder.decode(value, { stream: true });
    }
  } catch {
    return "";
  } finally {
    stream.releaseLock();
  }
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return falha("pedido_grande", 413);
  const origem = request.headers.get("origin");
  if (origem && origem !== new URL(request.url).origin) return falha("origem_invalida", 403);
  const texto = await lerCorpo(request);
  if (texto === null) return falha("pedido_grande", 413);
  let entrada: { requestId?: string; unidade?: string; modo?: string; bairro?: string; itens?: Array<{ id?: string; qtd?: number; precoCentavos?: number }>; taxaCentavos?: number | null };
  try {
    entrada = JSON.parse(texto);
  } catch {
    return falha("pedido_invalido", 400);
  }
  const unit = unidadeAndroid;
  const { requestId, unidade, modo, bairro, itens: pedidos, taxaCentavos } = entrada ?? {};
  if (!unit || unidade !== unit.id || typeof requestId !== "string" || !formatoUuid.test(requestId)
    || (modo !== "retirar" && modo !== "casa") || !Array.isArray(pedidos) || !pedidos.length || pedidos.length > MAX_ITENS_PRE_VENDA) {
    return falha("pedido_invalido", 400);
  }
  if (modo === "casa" && (typeof bairro !== "string" || !bairrosAndroid().includes(bairro))) {
    return falha("entrega_indisponivel", 409);
  }
  const taxa = modo === "casa" ? taxaDoBairro(bairro) : 0;
  if (taxa !== taxaCentavos) return falha("cesta_atualizada", 409);

  const catalogo = new Map((await catalogoAndroid()).map((p) => [p.id, p]));
  const vistos = new Set<string>();
  const itens: ReservaItem[] = [];
  for (const pedido of pedidos) {
    const { id, qtd, precoCentavos } = pedido ?? {};
    if (typeof id !== "string" || vistos.has(id) || typeof qtd !== "number" || !Number.isInteger(qtd) || qtd < 1) {
      return falha("pedido_invalido", 400);
    }
    vistos.add(id);
    const item = catalogo.get(id);
    if (!item?.precoCentavos || item.precoCentavos !== precoCentavos || qtd > item.limite) {
      return falha("cesta_atualizada", 409);
    }
    itens.push({ id, unitId: unit.id, nome: item.nome, qtd, precoCentavos: item.precoCentavos, receita: item.receita });
  }
  const bytes = Uint8Array.from(requestId.slice(0, 8).match(/../g) ?? [], (hex) => parseInt(hex, 16));
  const codigo = codigoDoPedido(bytes);
  const mensagem = mensagemReserva(unit.shortName, itens, {
    modo, nome: "", bairro, codigo, taxaEntregaCentavos: taxa ?? undefined,
    receita: "loja",
  });
  const whatsapp = buildWhatsAppUrl(unit, mensagem, { campaign: "reserva", content: `reserva_${unidade}` });
  const erro = await gravarPreVenda({
    requestId, codigo, unidade, modo,
    itens: itens.map((item) => ({ nome: item.nome, quantidade: item.qtd, precoCentavos: item.precoCentavos })),
  }, true);
  if (erro === "tentativa_invalida") return falha(erro, 409);
  if (erro) return falha(erro, 503);
  return Response.json({ codigo, whatsapp }, { status: 201, headers });
}
