import { env } from "cloudflare:workers";
import { criarLimitador, conteudoDaRespostaIA } from "../../busca-ia-nucleo";
import {
  limparRespostaReceita,
  MODELO_VISAO,
  MODELO_VISAO_RESERVA,
  paraDataUrl,
  PROMPT_RECEITA,
  TAMANHO_MAX_IMAGEM,
  tipoDaImagem,
} from "../../receita-ia-nucleo";

export const dynamic = "force-dynamic";

/** Tempo esperando cada modelo. O reserva só entra se o principal falhar; juntos ficam abaixo dos 35 s que o navegador espera. */
const TEMPO_PRINCIPAL_MS = 16_000;
const TEMPO_RESERVA_MS = 12_000;
/** Cada visitante: 6 receitas a cada 10 minutos. Todo o site: 300 por hora por instância (cada leitura custa uma fração de centavo). */
const limitePorVisitante = criarLimitador(6, 600_000);
const limiteGeral = criarLimitador(300, 3_600_000);

type Banco = {
  prepare(consulta: string): { bind(...valores: unknown[]): { first<T = unknown>(): Promise<T | null>; run(): Promise<unknown> } };
};
let tabelaPronta = false;

async function resumoDoVisitante(visitante: string): Promise<string> {
  const bytes = new TextEncoder().encode(`uf-receita|${visitante}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(hash.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Contador por visitante no banco (vale para todas as instâncias do Worker). Guarda só um resumo irreversível do IP e um número por janela, nunca a foto. Se o banco falhar, deixa passar e o limite local continua valendo. */
async function dentroDoLimiteCompartilhado(visitante: string, max: number, janelaMs: number): Promise<boolean> {
  try {
    const db = (env as { DB?: Banco }).DB;
    if (!db) return true;
    if (!tabelaPronta) {
      await db.prepare("CREATE TABLE IF NOT EXISTS limite_receita (chave TEXT NOT NULL, janela INTEGER NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (chave, janela))").bind().run();
      tabelaPronta = true;
    }
    const janela = Math.floor(Date.now() / janelaMs);
    const chave = await resumoDoVisitante(visitante);
    const linha = await db
      .prepare("INSERT INTO limite_receita (chave, janela, n) VALUES (?, ?, 1) ON CONFLICT(chave, janela) DO UPDATE SET n = n + 1 RETURNING n")
      .bind(chave, janela)
      .first<{ n: number }>();
    if (Math.random() < 0.02) await db.prepare("DELETE FROM limite_receita WHERE janela < ?").bind(janela - 1).run();
    return (linha?.n ?? 1) <= max;
  } catch {
    return true;
  }
}

type Ia = { run(modelo: string, entrada: Record<string, unknown>): Promise<unknown> };

function responder(corpo: Record<string, unknown>, status: number, estado: string) {
  return Response.json(corpo, { status, headers: { "cache-control": "no-store", "x-receita-ia": estado } });
}

async function lerComLimite(ia: Ia, modelo: string, imagem: string, extra: Record<string, unknown>, ms: number): Promise<unknown> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((resolve) => {
    temporizador = setTimeout(() => resolve(null), ms);
  });
  const chamada = ia
    .run(modelo, {
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT_RECEITA },
            { type: "image_url", image_url: { url: imagem } },
          ],
        },
      ],
      max_completion_tokens: 700,
      temperature: 0,
      response_format: { type: "json_object" },
      ...extra,
    })
    .catch(() => null);
  const resultado = await Promise.race([chamada, limite]);
  if (temporizador) clearTimeout(temporizador);
  return resultado;
}

/**
 * Lê uma foto de receita e devolve só os nomes e concentrações dos medicamentos.
 * A foto vive apenas na memória deste pedido: não é gravada, não vai para cache e não é registrada em log.
 * Quem casa os nomes com o catálogo é o navegador, e o farmacêutico confirma a receita antes de qualquer venda.
 */
export async function POST(request: Request) {
  // Só aceita pedidos feitos pelo próprio site.
  const origem = request.headers.get("origin");
  if (origem) {
    try {
      if (new URL(origem).host !== new URL(request.url).host) return responder({ erro: "origem" }, 403, "origem");
    } catch {
      return responder({ erro: "origem" }, 403, "origem");
    }
  }

  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (declarado > TAMANHO_MAX_IMAGEM) return responder({ erro: "grande" }, 413, "grande");

  const ia = (env as { AI?: Ia }).AI;
  if (!ia) return responder({ erro: "indisponivel" }, 503, "sem-binding");

  const visitante = request.headers.get("cf-connecting-ip") ?? "anonimo";
  if (!limitePorVisitante(visitante) || !limiteGeral("geral") || !(await dentroDoLimiteCompartilhado(visitante, 6, 600_000))) return responder({ erro: "limite" }, 429, "limite");

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return responder({ erro: "imagem" }, 400, "invalida");
  }
  if (bytes.length === 0) return responder({ erro: "imagem" }, 400, "invalida");
  if (bytes.length > TAMANHO_MAX_IMAGEM) return responder({ erro: "grande" }, 413, "grande");
  const tipo = tipoDaImagem(bytes);
  if (!tipo) return responder({ erro: "tipo" }, 415, "tipo");

  try {
    const imagem = paraDataUrl(bytes, tipo);
    let estado = "ia";
    let resultado = await lerComLimite(ia, MODELO_VISAO, imagem, { chat_template_kwargs: { enable_thinking: false } }, TEMPO_PRINCIPAL_MS);
    let limpa = resultado === null ? null : limparRespostaReceita(conteudoDaRespostaIA(resultado));
    if (!limpa) {
      estado = "reserva";
      resultado = await lerComLimite(ia, MODELO_VISAO_RESERVA, imagem, {}, TEMPO_RESERVA_MS);
      limpa = resultado === null ? null : limparRespostaReceita(conteudoDaRespostaIA(resultado));
    }
    if (!limpa) return responder({ erro: "falha" }, 502, "falha");
    return responder({ ehReceita: limpa.ehReceita, medicamentos: limpa.medicamentos }, 200, estado);
  } catch {
    return responder({ erro: "falha" }, 502, "erro");
  }
}
