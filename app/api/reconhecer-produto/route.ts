import { chamarGemini, MODELO_GEMINI_VISAO } from "../../gemini-nucleo";
import { segredo } from "../../estoque-fonte";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) {
    return Response.json({ ok: false, erro: "sem_chave" }, { status: 501 });
  }

  let corpo: { imagem?: string; tipo?: string } = {};
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const base64 = corpo.imagem?.replace(/^data:image\/\w+;base64,/, "");
  if (!base64 || base64.length < 100) {
    return Response.json({ ok: false, erro: "imagem_invalida" }, { status: 400 });
  }

  const resultado = await chamarGemini({
    modelo: MODELO_GEMINI_VISAO,
    chave,
    sistema: `Você identifica produtos de farmácia/drogaria em fotos de embalagens.
Responda APENAS com o nome do produto mais provável, em português, curto (máx 60 caracteres).
Se não conseguir identificar, responda "nao_identificado".
Não invente. Não adicione explicação.`,
    texto: "Qual produto está nesta embalagem?",
    imagem: { tipo: corpo.tipo || "image/jpeg", base64 },
    maxTokens: 80,
    ms: 15000,
  });

  if (!resultado) {
    return Response.json({ ok: false, erro: "falha_ia" }, { status: 502 });
  }

  const nome = resultado.response.trim().slice(0, 80);
  return Response.json({ ok: true, produto: nome === "nao_identificado" ? null : nome });
}
