import { chaveDoNome } from "../../../../nomes-corrigidos";
import { conteudoDaRespostaIA, criarLimitador } from "../../../../busca-ia-nucleo";
import { disparar } from "./disparo";
import { banco, segredo } from "../../../../estoque-fonte";
import { chamarGeminiComMotivo, esquemaParaGemini, MODELO_GEMINI_TEXTO, modeloEscolhido } from "../../../../gemini-nucleo";
import { carregarCatalogoCompleto } from "../../../../nacoes-unidas/produtos/catalogo";
import { carregarRestritos } from "../../../../nacoes-unidas/produtos/receita";
import { definirPalavras, ESQUEMA_PALAVRAS, lerLotePalavras, mapaDePalavras, PROMPT_PALAVRAS } from "../../../../palavras-busca";

export const dynamic = "force-dynamic";
const SEM_CACHE = { "cache-control": "no-store" };
const limite = criarLimitador(6, 600_000);
const POR_PEDIDO = 60;
const POR_CHAMADA = 15;
const EM_PARALELO = 4;

/** Produtos que ainda não têm palavras: tudo que NÃO é medicamento (remédio usa nome, princípio ativo e a lista fixa de sintomas). */
async function faltando() {
  const db = banco();
  if (!db) return null;
  const r = carregarRestritos();
  const restritos = new Set([...r.receita, ...r.controlados, ...r.consulte].map((i) => chaveDoNome(i.nome)));
  const feitas = await mapaDePalavras(db);
  const vistos = new Set<string>();
  const lista: { nome: string; categoria: string }[] = [];
  for (const i of carregarCatalogoCompleto().itens) {
    const k = chaveDoNome(i.nome);
    if (vistos.has(k)) continue;
    vistos.add(k);
    if (i.isMIP || i.categoria === "Medicamentos" || restritos.has(k) || feitas[k]) continue;
    lista.push({ nome: i.nome, categoria: i.categoria });
  }
  return { db, lista, comPalavras: Object.keys(feitas).length };
}

/** Gera palavras de busca para até 60 produtos por pedido (só equipe logada). Os produtos novos entram na busca na próxima publicação. */
export async function POST(request: Request) {
  const chave = segredo("GEMINI_API_KEY");
  if (!chave) return Response.json({ ok: false, erro: "sem_ia" }, { status: 501, headers: SEM_CACHE });
  if (!limite(request.headers.get("cf-connecting-ip") ?? "equipe")) return Response.json({ ok: false, erro: "limite" }, { status: 429, headers: SEM_CACHE });
  const f = await faltando();
  if (!f) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  const escolhidos = f.lista.slice(0, POR_PEDIDO);
  const grupos: { nome: string; categoria: string }[][] = [];
  for (let i = 0; i < escolhidos.length; i += POR_CHAMADA) grupos.push(escolhidos.slice(i, i + POR_CHAMADA));
  let salvos = 0;
  let semPalavras = 0;
  let falhas = 0;
  let motivo = "";
  for (let g = 0; g < grupos.length; g += EM_PARALELO) {
    await Promise.all(
      grupos.slice(g, g + EM_PARALELO).map(async (grupo) => {
        const r = await chamarGeminiComMotivo({
          modelo: modeloEscolhido(segredo("GEMINI_MODELO_PAINEL"), MODELO_GEMINI_TEXTO),
          chave,
          sistema: PROMPT_PALAVRAS,
          texto: JSON.stringify({ itens: grupo.map((p, i) => ({ i: i + 1, nome: p.nome, categoria: p.categoria })) }),
          maxTokens: 2000,
          ms: 25_000,
          esquema: esquemaParaGemini(ESQUEMA_PALAVRAS),
        });
        if (!r.ok) {
          falhas += grupo.length;
          motivo = r.motivo;
          return;
        }
        const lido = lerLotePalavras(conteudoDaRespostaIA({ response: r.response }), grupo.map((p) => p.nome));
        for (let i = 0; i < grupo.length; i++) {
          const palavras = lido.get(i + 1) ?? [];
          if (palavras.length === 0) {
            semPalavras++;
            continue;
          }
          if (await definirPalavras(f.db, grupo[i].nome, palavras, "ia", "gemini")) salvos++;
        }
      }),
    );
  }
  if (salvos > 0) await disparar(f.db);
  return Response.json({ ok: true, salvos, semPalavras, falhas, motivo: falhas ? motivo : undefined, restantes: Math.max(0, f.lista.length - salvos) }, { headers: SEM_CACHE });
}

/** Quantos produtos já têm palavras e quantos faltam. */
export async function GET() {
  const f = await faltando();
  if (!f) return Response.json({ ok: false, erro: "sem_banco" }, { status: 501, headers: SEM_CACHE });
  return Response.json({ ok: true, comPalavras: f.comPalavras, faltam: f.lista.length, ia: Boolean(segredo("GEMINI_API_KEY")) }, { headers: SEM_CACHE });
}
