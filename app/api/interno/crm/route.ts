import {
  alterarConversaCrm,
  detalharConversaCrm,
  envioCrmDisponivel,
  ErroCrm,
  ESTADOS_CRM,
  listarConversasCrm,
  modoCrm,
  type EstadoCrm,
} from "../../../whatsapp-crm-store";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function falha(error: unknown) {
  if (error instanceof ErroCrm) return json({ erro: error.message }, error.status);
  console.error("[whatsapp-crm] Falha de armazenamento.");
  return json({ erro: "Não foi possível acessar o CRM. Tente novamente." }, 503);
}

const ID_VALIDO = /^(?:demo|\d{5,24}):\d{8,15}$/;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const modo = modoCrm(url);
    const id = url.searchParams.get("id");
    const envioDisponivel = envioCrmDisponivel(modo);
    if (id === null) return json({ modo, envioDisponivel, conversas: await listarConversasCrm(modo) });
    if (!ID_VALIDO.test(id)) return json({ erro: "Conversa inválida." }, 400);
    return json({ modo, envioDisponivel, ...await detalharConversaCrm(modo, id) });
  } catch (error) {
    return falha(error);
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const origem = request.headers.get("origin");
    if (origem && origem !== url.origin) return json({ erro: "Origem inválida." }, 403);
    const modo = modoCrm(url);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return json({ erro: "Envie dados no formato JSON." }, 415);
    }
    const corpo = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (typeof corpo?.id !== "string" || !ID_VALIDO.test(corpo.id)) return json({ erro: "Conversa inválida." }, 400);
    const { id, acao } = corpo;
    const valor = typeof corpo.valor === "string" ? corpo.valor.trim() : "";

    if (acao === "status" && ESTADOS_CRM.includes(valor as EstadoCrm)) {
      await alterarConversaCrm(modo, id, { acao, valor: valor as EstadoCrm });
    } else if (acao === "ler" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(valor)) {
      await alterarConversaCrm(modo, id, { acao, valor });
    } else if (acao === "nota" && valor && valor.length <= 4096) {
      await alterarConversaCrm(modo, id, { acao, valor });
    } else if (acao === "responder" && valor && valor.length <= 4096) {
      const solicitacaoId = corpo.solicitacaoId ?? crypto.randomUUID();
      if (typeof solicitacaoId !== "string" || !/^[\da-f-]{36}$/i.test(solicitacaoId)) {
        return json({ erro: "Identificador de envio inválido." }, 400);
      }
      await alterarConversaCrm(modo, id, { acao, valor, solicitacaoId });
    } else {
      return json({ erro: "Ação ou conteúdo inválido." }, 400);
    }
    return json({ ok: true });
  } catch (error) {
    return falha(error);
  }
}
