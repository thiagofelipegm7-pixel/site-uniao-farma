/**
 * Pedido de avaliação no Google: a equipe vê em /interno/vendas?aba=avaliacoes e manda, à mão, um WhatsApp
 * com o link para avaliar a loja certa. Nada é enviado automaticamente. Só entra quem marcou a caixa
 * (desmarcada por padrão) no checkout e cujo pedido foi marcado como venda concluída. A lista aparece
 * 1 dia depois da conclusão (retirada ou entrega). Dados somem em 7 dias. O texto da mensagem não é guardado.
 * Módulo sem Cloudflare (testável).
 */
import { URL_AVALIACOES_GOOGLE } from "./data/avaliacoes-google";
import { type Banco } from "./nomes-corrigidos";
import { hashTelefone, linkWhatsApp } from "./recompra";
import { normalizarTelefone } from "./reserva/lembrete-recompra";

export { linkWhatsApp, normalizarTelefone };

export const TEXTO_CONSENTIMENTO_AVALIACAO =
  "Depois da retirada ou da entrega, a loja pode me chamar no WhatsApp pedindo uma avaliação no Google";

/** Tempo depois da venda concluída para o pedido aparecer na lista da equipe. */
export const ESPERA_DIAS = 1;
export const ESPERA_MS = ESPERA_DIAS * 86_400_000;
/** Nome e celular somem depois deste prazo, contado a partir do consentimento. */
export const RETENCAO_DIAS = 7;

export type UnitIdAvaliacao = "fatima" | "nacoes" | "itacolomi";
export type ModoPedido = "retirar" | "casa";
export type ConsentimentoAvaliacao = { nome: string; telefone: string };

export const NOME_LOJA_AVALIACAO: Record<UnitIdAvaliacao, string> = {
  fatima: "Fátima",
  nacoes: "Nações Unidas",
  itacolomi: "Itacolomi",
};

export function ehUnidadeAvaliacao(valor: string): valor is UnitIdAvaliacao {
  return valor === "fatima" || valor === "nacoes" || valor === "itacolomi";
}

/** Place ID público já usado no site (perfil de avaliações de cada loja). */
export function placeIdDaLoja(unitId: UnitIdAvaliacao): string {
  const url = URL_AVALIACOES_GOOGLE[unitId];
  try {
    return new URL(url).searchParams.get("placeid") ?? "";
  } catch {
    return "";
  }
}

/** Link oficial do Google para escrever uma avaliação da loja. */
export function linkEscreverAvaliacao(unitId: UnitIdAvaliacao): string {
  const placeId = placeIdDaLoja(unitId);
  return placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : "";
}

export function limparNome(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const n = bruto.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return n.length >= 2 ? n : null;
}

/** Só vale com consentimento === true, nome e celular válidos. */
export function validarConsentimentoAvaliacao(entrada: unknown): ConsentimentoAvaliacao | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as { consentimento?: unknown; nome?: unknown; telefone?: unknown };
  if (e.consentimento !== true) return null;
  const nome = limparNome(e.nome);
  const telefone = normalizarTelefone(e.telefone);
  return nome && telefone ? { nome, telefone } : null;
}

const titulo = (t: string) => t.toLocaleLowerCase("pt-BR").replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("pt-BR"));

/**
 * Mensagem pronta: curta, só sobre atendimento, retirada e entrega; com o link da loja certa.
 * Sem produto, remédio, saúde, incentivo, desconto ou pedido de nota.
 */
export function mensagemPedirAvaliacao(nome: string, unitId: UnitIdAvaliacao): string {
  const primeiro = titulo(nome.trim().split(/\s+/)[0] || "oi");
  const loja = NOME_LOJA_AVALIACAO[unitId];
  const link = linkEscreverAvaliacao(unitId);
  return `Oi, ${primeiro}! Aqui é da União Farma Sabará. Obrigado pelo seu pedido na loja ${loja}. Se gostou do atendimento, da retirada ou da entrega, você pode avaliar a loja no Google, se quiser: ${link}\n\nSe não quiser mais avisos, responda SAIR.`;
}

export function rotuloModo(modo: string, unitId: UnitIdAvaliacao): string {
  const loja = NOME_LOJA_AVALIACAO[unitId];
  return modo === "casa" ? `Entrega da loja ${loja}` : `Retirada na loja ${loja}`;
}

export type LinhaAvaliacao = {
  pre_venda_id: string;
  nome: string;
  telefone: string;
  consentido_em: string;
  status: string;
  unidade: string;
  modo: string;
  status_pedido: string;
  pedido_atualizado_em: string;
};

export type PedidoParaAvaliar = {
  id: string;
  nome: string;
  telefone: string;
  loja: string;
  modo: string;
  rotulo: string;
  concluidoEm: string;
  diasDesde: number;
  mensagem: string;
  link: string;
  linkGoogle: string;
};

export type ListaAvaliacoes = { pendentes: PedidoParaAvaliar[]; enviados: number; descartados: number };

/** Monta a lista da equipe (função pura). Um aviso por telefone, o pedido concluído mais recente. */
export function montarListaAvaliacoes(
  linhas: readonly LinhaAvaliacao[],
  agoraMs: number,
  bloqueados: ReadonlySet<string> = new Set(),
): PedidoParaAvaliar[] {
  const jaAvisado = new Set<string>();
  for (const l of linhas) {
    if (l.status === "enviado" && l.telefone) jaAvisado.add(l.telefone);
  }
  const ultimaPendente = new Map<string, LinhaAvaliacao>();
  for (const l of linhas) {
    if (l.status !== "pendente" || !l.telefone || bloqueados.has(l.telefone) || jaAvisado.has(l.telefone)) continue;
    if (l.status_pedido !== "concluida" || !ehUnidadeAvaliacao(l.unidade)) continue;
    const atual = ultimaPendente.get(l.telefone);
    if (!atual || Date.parse(l.pedido_atualizado_em) > Date.parse(atual.pedido_atualizado_em)) ultimaPendente.set(l.telefone, l);
  }
  const lista: PedidoParaAvaliar[] = [];
  for (const l of ultimaPendente.values()) {
    const concluido = Date.parse(l.pedido_atualizado_em);
    if (!Number.isFinite(concluido) || agoraMs - concluido < ESPERA_MS) continue;
    const unitId = l.unidade as UnitIdAvaliacao;
    const linkGoogle = linkEscreverAvaliacao(unitId);
    if (!linkGoogle) continue;
    const mensagem = mensagemPedirAvaliacao(l.nome, unitId);
    lista.push({
      id: l.pre_venda_id,
      nome: l.nome,
      telefone: l.telefone,
      loja: NOME_LOJA_AVALIACAO[unitId],
      modo: l.modo === "casa" ? "casa" : "retirar",
      rotulo: rotuloModo(l.modo, unitId),
      concluidoEm: l.pedido_atualizado_em,
      diasDesde: Math.max(1, Math.floor((agoraMs - concluido) / 86_400_000)),
      mensagem,
      link: linkWhatsApp(l.telefone, mensagem),
      linkGoogle,
    });
  }
  return lista.sort((a, b) => b.diasDesde - a.diasDesde || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function garantirTabelas(db: Banco): Promise<void> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS avaliacao_google_pedido (pre_venda_id TEXT PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT NOT NULL, consentimento_texto TEXT NOT NULL, consentido_em TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)",
  );
  await db.exec("CREATE INDEX IF NOT EXISTS avaliacao_google_pedido_telefone ON avaliacao_google_pedido (telefone)");
  await db.exec("CREATE INDEX IF NOT EXISTS avaliacao_google_pedido_status ON avaliacao_google_pedido (status, consentido_em)");
  // Opt-out compartilhado com o lembrete de recompra (resposta SAIR). Só CREATE IF NOT EXISTS.
  await db.exec("CREATE TABLE IF NOT EXISTS recompra_optout (telefone_hash TEXT PRIMARY KEY, criado_em TEXT NOT NULL)");
}

export async function limparExpiradas(db: Banco, agora: Date): Promise<void> {
  const limite = new Date(agora.getTime() - RETENCAO_DIAS * 86_400_000).toISOString();
  await db.prepare("DELETE FROM avaliacao_google_pedido WHERE criado_em < ?").bind(limite).run();
}

/** Guarda o consentimento junto com a cesta (mesmo id da pre_venda). Sem itens e sem o texto da mensagem. */
export async function gravarConsentimentoAvaliacao(db: Banco, preVendaId: string, consentimento: ConsentimentoAvaliacao, agora: Date): Promise<void> {
  await garantirTabelas(db);
  await limparExpiradas(db, agora);
  const quando = agora.toISOString();
  await db
    .prepare(
      "INSERT OR IGNORE INTO avaliacao_google_pedido (pre_venda_id, nome, telefone, consentimento_texto, consentido_em, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, 'pendente', ?, ?)",
    )
    .bind(preVendaId, consentimento.nome, consentimento.telefone, TEXTO_CONSENTIMENTO_AVALIACAO, quando, quando, quando)
    .run();
}

export async function listarPedidosAvaliacao(db: Banco, agoraMs: number): Promise<ListaAvaliacoes> {
  const agora = new Date(agoraMs);
  await garantirTabelas(db);
  await limparExpiradas(db, agora);
  const limite = new Date(agoraMs - RETENCAO_DIAS * 86_400_000).toISOString();
  const { results } = await db
    .prepare(
      "SELECT c.pre_venda_id, c.nome, c.telefone, c.consentido_em, c.status, p.unidade, p.modo, p.status AS status_pedido, p.atualizado_em AS pedido_atualizado_em FROM avaliacao_google_pedido c JOIN pre_venda p ON p.id = c.pre_venda_id WHERE c.criado_em >= ? LIMIT 1000",
    )
    .bind(limite)
    .all<LinhaAvaliacao>();
  const { results: bloqueios } = await db.prepare("SELECT telefone_hash, criado_em FROM recompra_optout").bind().all<{ telefone_hash: string; criado_em: string }>();
  const quandoBloqueou = new Map(bloqueios.map((b) => [b.telefone_hash, b.criado_em]));
  const bloqueados = new Set<string>();
  for (const l of results) {
    if (!l.telefone) continue;
    const em = quandoBloqueou.get(await hashTelefone(l.telefone));
    if (em && l.consentido_em <= em) bloqueados.add(l.telefone);
  }
  return {
    pendentes: montarListaAvaliacoes(results, agoraMs, bloqueados),
    enviados: results.filter((l) => l.status === "enviado").length,
    descartados: results.filter((l) => l.status === "descartado").length,
  };
}

export async function marcarAvaliacao(db: Banco, id: string, acao: "enviado" | "descartado", agora: Date): Promise<boolean> {
  await garantirTabelas(db);
  const linha = await db.prepare("SELECT pre_venda_id, status FROM avaliacao_google_pedido WHERE pre_venda_id = ?").bind(id).first<{ pre_venda_id: string; status: string }>();
  if (!linha || linha.status !== "pendente") return false;
  const quando = agora.toISOString();
  if (acao === "descartado") {
    await db
      .prepare("UPDATE avaliacao_google_pedido SET status = 'descartado', nome = '', telefone = '', atualizado_em = ? WHERE pre_venda_id = ? AND status = 'pendente'")
      .bind(quando, id)
      .run();
    return true;
  }
  await db.prepare("UPDATE avaliacao_google_pedido SET status = 'enviado', atualizado_em = ? WHERE pre_venda_id = ? AND status = 'pendente'").bind(quando, id).run();
  return true;
}
