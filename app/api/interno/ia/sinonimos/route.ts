import { conteudoDaRespostaIA, criarLimitador } from "../../../../busca-ia-nucleo";
import { topBuscas } from "../../../../busca-sem-resultado";
import { banco, segredo } from "../../../../estoque-fonte";
import { chamarGeminiComMotivo, esquemaParaGemini, MODELO_GEMINI_TEXTO, modeloEscolhido } from "../../../../gemini-nucleo";
import { ESQUEMA_SINONIMOS, guardarSinonimo, lerSinonimos, PROMPT_SINONIMOS, sinonimosPendentes, termosJaTratados } from "../../../../sinonimos-ia";
import { produtosBuscaveis, produtosDaAlternativa } from "../../../../sinonimos-ia-servidor";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const limite = criarLimitador(10, 600_000);
const diaBrasilia = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

/** Sugestões que esperam a equipe (só equipe logada). */
export async function GET() {
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  return Response.json({ ok: true, itens: await sinonimosPendentes(db), ia: Boolean(segredo("GEMINI_API_KEY")) }, { headers: SEM_CACHE });
}

/** Pede ao Gemini sinônimos para até 30 buscas que ficaram vazias (ainda não analisadas). Não muda a busca: a equipe aprova depois. */
export async function POST(request: Request) {
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) return Response.json({ ok: false, erro: "sem_ia" }, { status: 501, headers: SEM_CACHE });
  if (!limite(request.headers.get("cf-connecting-ip") ?? "equipe")) return Response.json({ ok: false, erro: "limite" }, { status: 429, headers: SEM_CACHE });
  const db = banco();
  if (!db) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const tratados = await termosJaTratados(db);
  const termos = (await topBuscas(db, diaBrasilia(), 30, 200)).filter((l) => l.vazia > 0 && !tratados.has(l.termo)).slice(0, 30).map((l) => l.termo);
  if (termos.length === 0) return Response.json({ ok: true, sugeridos: 0, semSugestao: 0, falta: 0 }, { headers: SEM_CACHE });
  const { itens, vocab, palavrasPrompt } = await produtosBuscaveis(db);
  const r = await chamarGeminiComMotivo({
    modelo: modeloEscolhido(segredo("GEMINI_MODELO_PAINEL"), MODELO_GEMINI_TEXTO),
    chave,
    sistema: PROMPT_SINONIMOS,
    texto: JSON.stringify({ pedidos: termos.map((termo, i) => ({ i: i + 1, termo })), palavras: palavrasPrompt }),
    maxTokens: 1500,
    ms: 30_000,
    esquema: esquemaParaGemini(ESQUEMA_SINONIMOS),
  });
  if (!r.ok) return Response.json({ ok: false, erro: "falha_ia", motivo: r.motivo }, { status: 502, headers: SEM_CACHE });
  const lido = lerSinonimos(conteudoDaRespostaIA({ response: r.response }), termos, vocab, (alt) => produtosDaAlternativa(itens, alt).length);
  let sugeridos = 0;
  let semSugestao = 0;
  for (let i = 0; i < termos.length; i++) {
    const alts = lido.get(i + 1);
    if (!alts) continue; // a IA não respondeu este: fica para a próxima
    if (alts.length > 0) {
      await guardarSinonimo(db, termos[i], alts, "pendente");
      sugeridos++;
    } else {
      await guardarSinonimo(db, termos[i], [], "sem_sugestao");
      semSugestao++;
    }
  }
  return Response.json({ ok: true, sugeridos, semSugestao, falta: termos.length - sugeridos - semSugestao }, { headers: SEM_CACHE });
}
