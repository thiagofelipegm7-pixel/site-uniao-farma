import { env } from "cloudflare:workers";
import { UNITS } from "./site-config";
import { sendWhatsAppText, type EntradaCrmWhatsApp } from "./whatsapp-cloud";

export const ESTADOS_CRM = ["novo", "em_atendimento", "aguardando", "encerrado"] as const;
export type EstadoCrm = (typeof ESTADOS_CRM)[number];
export type ModoCrm = "demo" | "real";

const CANAL_DEMO = "demo";
const DIA = 86_400_000;
const RETENCAO_DIAS = 90;

const SCHEMA_CRM = [
  `CREATE TABLE IF NOT EXISTS whatsapp_crm_conversas (
    id TEXT PRIMARY KEY, canal TEXT NOT NULL, unidade TEXT NOT NULL,
    telefone TEXT NOT NULL, nome TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'novo', atualizado_em TEXT NOT NULL,
    ultima_entrada_em TEXT NOT NULL, nao_lidas INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS whatsapp_crm_mensagens (
    id TEXT PRIMARY KEY, conversa_id TEXT NOT NULL REFERENCES whatsapp_crm_conversas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, texto TEXT NOT NULL, criada_em TEXT NOT NULL,
    estado_envio TEXT NOT NULL DEFAULT 'registrada'
  )`,
  `CREATE INDEX IF NOT EXISTS whatsapp_crm_historico
    ON whatsapp_crm_mensagens (conversa_id, criada_em DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_crm_fila ON whatsapp_crm_conversas (atualizado_em DESC)`,
  `CREATE INDEX IF NOT EXISTS whatsapp_crm_retencao ON whatsapp_crm_mensagens (criada_em)`,
];

const SELECT_CONVERSAS = `SELECT c.id, c.nome, c.telefone, c.unidade, c.status,
    c.atualizado_em AS atualizadoEm, c.ultima_entrada_em AS ultimaEntradaEm, c.nao_lidas AS naoLidas,
    COALESCE((SELECT m.texto FROM whatsapp_crm_mensagens m
      WHERE m.conversa_id = c.id AND m.tipo != 'nota' AND m.estado_envio = 'registrada'
      ORDER BY m.criada_em DESC, m.id DESC LIMIT 1), '') AS preview
  FROM whatsapp_crm_conversas c
  WHERE (c.canal = ?) = ?`;

type Conversa = {
  id: string;
  nome: string;
  telefone: string;
  unidade: string;
  status: EstadoCrm;
  atualizadoEm: string;
  ultimaEntradaEm: string;
  naoLidas: number;
  preview: string;
};

type Mensagem = { id: string; tipo: "entrada" | "saida" | "nota"; texto: string; criadaEm: string };

type ResultadoD1 = { meta: { changes: number } };
type StatementCrm = {
  bind(...values: unknown[]): StatementCrm;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<ResultadoD1>;
};
type BancoCrm = {
  prepare(sql: string): StatementCrm;
  batch(statements: StatementCrm[]): Promise<unknown>;
};

export class ErroCrm extends Error {
  constructor(readonly status: number, mensagem: string) {
    super(mensagem);
  }
}

export function crmWhatsAppHabilitado() {
  return process.env.CRM_WHATSAPP_ENABLED === "on";
}

export function modoCrm(url: URL): ModoCrm {
  if (process.env.CRM_WHATSAPP_DEMO === "on" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    return "demo";
  }
  if (crmWhatsAppHabilitado()) return "real";
  throw new ErroCrm(503, "CRM aguardando ativação. Confira a configuração do WhatsApp Business.");
}

export function envioCrmDisponivel(modo: ModoCrm) {
  return modo === "demo" || Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim());
}

async function prepararBanco(db: BancoCrm) {
  await db.batch(SCHEMA_CRM.map((sql) => db.prepare(sql)));
}

function bancoCrm(): BancoCrm {
  const db = (env as { DB?: BancoCrm }).DB;
  if (!db) throw new ErroCrm(503, "Banco de dados do CRM indisponível.");
  return db;
}

export async function limparCrm(db: BancoCrm, agora = Date.now()) {
  await prepararBanco(db);
  const limite = new Date(agora - RETENCAO_DIAS * DIA).toISOString();
  await db.batch([
    db.prepare(`DELETE FROM whatsapp_crm_mensagens
      WHERE criada_em < ? AND EXISTS (
        SELECT 1 FROM whatsapp_crm_conversas c WHERE c.id = conversa_id AND c.canal != ?
      )`).bind(limite, CANAL_DEMO),
    db.prepare("DELETE FROM whatsapp_crm_conversas WHERE canal != ? AND atualizado_em < ?").bind(CANAL_DEMO, limite),
  ]);
}

function idConversa(canal: string, telefone: string) {
  return `${canal}:${telefone}`;
}

export async function registrarEntradasCrm(entradas: EntradaCrmWhatsApp[]) {
  if (!entradas.length) return;
  const db = bancoCrm();
  await limparCrm(db);
  const limite = new Date(Date.now() - RETENCAO_DIAS * DIA).toISOString();
  for (const entrada of entradas) {
    if (entrada.criadaEm < limite) continue;
    const conversa = idConversa(entrada.canal, entrada.telefone);
    const mensagem = `entrada:${entrada.id}`;
    await db.batch([
      db.prepare(`INSERT INTO whatsapp_crm_conversas
        (id, canal, unidade, telefone, nome, atualizado_em, ultima_entrada_em, nao_lidas)
        SELECT ?, ?, ?, ?, ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM whatsapp_crm_mensagens WHERE id = ?)
        ON CONFLICT(id) DO UPDATE SET
          nome = CASE WHEN excluded.nome != '' AND excluded.ultima_entrada_em >= ultima_entrada_em
            THEN excluded.nome ELSE nome END,
          atualizado_em = MAX(atualizado_em, excluded.atualizado_em),
          ultima_entrada_em = MAX(ultima_entrada_em, excluded.ultima_entrada_em),
          nao_lidas = nao_lidas + 1,
          status = CASE WHEN status = 'encerrado' AND excluded.ultima_entrada_em >= atualizado_em
            THEN 'novo' ELSE status END`).bind(
        conversa, entrada.canal, entrada.unidade, entrada.telefone, entrada.nome,
        entrada.criadaEm, entrada.criadaEm, mensagem,
      ),
      db.prepare(`INSERT INTO whatsapp_crm_mensagens (id, conversa_id, tipo, texto, criada_em)
        VALUES (?, ?, 'entrada', ?, ?) ON CONFLICT(id) DO NOTHING`).bind(
        mensagem, conversa, entrada.texto, entrada.criadaEm,
      ),
    ]);
  }
}

const DEMO: Array<{
  nome: string; unidade: string; horas: number; status: EstadoCrm; texto: string; resposta?: string;
}> = [
  { nome: "Mariana Costa", unidade: "nacoes", horas: 0.1, status: "novo", texto: "Oi, boa tarde! Vocês entregam no bairro Nações Unidas?" },
  { nome: "Rafael Lima", unidade: "fatima", horas: 0.5, status: "em_atendimento", texto: "Boa tarde! Até que horas posso passar aí hoje?", resposta: "Boa tarde, Rafael! Vou confirmar o horário da unidade para você." },
  { nome: "Beatriz Almeida", unidade: "itacolomi", horas: 1.5, status: "aguardando", texto: "Posso buscar meu pedido no balcão?", resposta: "Pode sim! Você consegue me passar o número do pedido?" },
  { nome: "Daniel Souza", unidade: "nacoes", horas: 2, status: "novo", texto: "Qual o endereço da loja de Nações Unidas?" },
  { nome: "Carla Oliveira", unidade: "fatima", horas: 30, status: "encerrado", texto: "Obrigada, encontrei a loja!" },
];

async function prepararDemo(db: BancoCrm) {
  const existente = await db.prepare("SELECT 1 FROM whatsapp_crm_conversas WHERE canal = ? LIMIT 1").bind(CANAL_DEMO).first();
  if (existente) return;
  const agora = Date.now();
  await db.batch(DEMO.flatMap((item, index) => {
    const telefone = `550000000000${index + 1}`;
    const conversa = idConversa(CANAL_DEMO, telefone);
    const entrada = new Date(agora - item.horas * 3_600_000).toISOString();
    const atualizacao = item.resposta ? new Date(Date.parse(entrada) + 60_000).toISOString() : entrada;
    const statements = [
      db.prepare(`INSERT INTO whatsapp_crm_conversas
        (id, canal, unidade, telefone, nome, status, atualizado_em, ultima_entrada_em, nao_lidas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`).bind(
        conversa, CANAL_DEMO, item.unidade, telefone, item.nome, item.status, atualizacao, entrada, Number(item.status === "novo"),
      ),
      db.prepare(`INSERT INTO whatsapp_crm_mensagens (id, conversa_id, tipo, texto, criada_em)
        VALUES (?, ?, 'entrada', ?, ?) ON CONFLICT(id) DO NOTHING`).bind(`demo:entrada:${index}`, conversa, item.texto, entrada),
    ];
    if (item.resposta) statements.push(db.prepare(`INSERT INTO whatsapp_crm_mensagens (id, conversa_id, tipo, texto, criada_em)
      VALUES (?, ?, 'saida', ?, ?) ON CONFLICT(id) DO NOTHING`).bind(`demo:saida:${index}`, conversa, item.resposta, atualizacao));
    return statements;
  }));
}

async function bancoParaModo(modo: ModoCrm) {
  const db = bancoCrm();
  if (modo === "demo") {
    await prepararBanco(db);
    await prepararDemo(db);
  } else {
    await limparCrm(db);
  }
  return db;
}

function rotularConversa(conversa: Conversa) {
  return { ...conversa, unidade: UNITS.find((unidade) => unidade.id === conversa.unidade)?.shortName ?? conversa.unidade };
}

export async function listarConversasCrm(modo: ModoCrm) {
  const db = await bancoParaModo(modo);
  const { results } = await db.prepare(`${SELECT_CONVERSAS} ORDER BY c.atualizado_em DESC, c.id LIMIT 500`)
    .bind(CANAL_DEMO, Number(modo === "demo")).all<Conversa>();
  return results.map(rotularConversa);
}

export async function detalharConversaCrm(modo: ModoCrm, id: string) {
  const db = await bancoParaModo(modo);
  const conversa = await db.prepare(`${SELECT_CONVERSAS} AND c.id = ?`).bind(CANAL_DEMO, Number(modo === "demo"), id).first<Conversa>();
  if (!conversa) throw new ErroCrm(404, "Conversa não encontrada.");
  const { results } = await db.prepare(`SELECT id, tipo, texto, criada_em AS criadaEm
    FROM whatsapp_crm_mensagens WHERE conversa_id = ? AND estado_envio = 'registrada'
    ORDER BY criada_em DESC, id DESC LIMIT 200`).bind(id).all<Mensagem>();
  return { conversa: rotularConversa(conversa), mensagens: results.reverse() };
}

type AcaoCrm =
  | { acao: "status"; valor: EstadoCrm }
  | { acao: "ler" | "nota"; valor: string }
  | { acao: "responder"; valor: string; solicitacaoId: string };

export async function alterarConversaCrm(modo: ModoCrm, id: string, pedido: AcaoCrm) {
  const db = await bancoParaModo(modo);
  const conversa = await db.prepare(`SELECT canal, telefone, ultima_entrada_em AS ultimaEntradaEm
    FROM whatsapp_crm_conversas WHERE id = ? AND (canal = ?) = ?`).bind(id, CANAL_DEMO, Number(modo === "demo"))
    .first<{ canal: string; telefone: string; ultimaEntradaEm: string }>();
  if (!conversa) throw new ErroCrm(404, "Conversa não encontrada.");
  const agora = new Date().toISOString();

  switch (pedido.acao) {
    case "ler":
      await db.prepare("UPDATE whatsapp_crm_conversas SET nao_lidas = 0 WHERE id = ? AND ultima_entrada_em <= ?")
        .bind(id, pedido.valor).run();
      return;
    case "status":
      await db.prepare("UPDATE whatsapp_crm_conversas SET status = ?, atualizado_em = MAX(atualizado_em, ?) WHERE id = ?")
        .bind(pedido.valor, agora, id).run();
      return;
    case "nota":
      await db.batch([
        db.prepare(`INSERT INTO whatsapp_crm_mensagens (id, conversa_id, tipo, texto, criada_em)
          VALUES (?, ?, 'nota', ?, ?)`).bind(crypto.randomUUID(), id, pedido.valor, agora),
        db.prepare("UPDATE whatsapp_crm_conversas SET atualizado_em = MAX(atualizado_em, ?) WHERE id = ?").bind(agora, id),
      ]);
      return;
    case "responder":
      await responderCrm(db, modo, id, conversa, pedido, agora);
  }
}

async function responderCrm(
  db: BancoCrm,
  modo: ModoCrm,
  id: string,
  conversa: { telefone: string; canal: string; ultimaEntradaEm: string },
  pedido: Extract<AcaoCrm, { acao: "responder" }>,
  agora: string,
) {
  const mensagem = `saida:${id}:${pedido.solicitacaoId}`;
  const anterior = await db.prepare("SELECT texto, estado_envio FROM whatsapp_crm_mensagens WHERE id = ?")
    .bind(mensagem).first<{ texto: string; estado_envio: string }>();
  if (anterior?.estado_envio === "registrada" && anterior.texto === pedido.valor) return;
  if (anterior) throw envioIncerto();
  if (Date.parse(agora) - Date.parse(conversa.ultimaEntradaEm) >= DIA) {
    throw new ErroCrm(409, "A janela de 24 horas do WhatsApp encerrou. Aguarde uma nova mensagem do cliente.");
  }
  if (!envioCrmDisponivel(modo)) throw new ErroCrm(503, "Envio indisponível. Confira o token do WhatsApp Business.");

  const reserva = await db.prepare(`INSERT INTO whatsapp_crm_mensagens
    (id, conversa_id, tipo, texto, criada_em, estado_envio) VALUES (?, ?, 'saida', ?, ?, 'enviando')
    ON CONFLICT(id) DO NOTHING`).bind(mensagem, id, pedido.valor, agora).run();
  if (!reserva.meta.changes) throw envioIncerto();

  if (modo === "real") {
    const resultado = await sendWhatsAppText(conversa.canal, conversa.telefone, pedido.valor).catch(() => null);
    if (!resultado || (resultado.ok === false && /^graph_5/.test(resultado.error))) throw envioIncerto();
    if (!resultado.ok) {
      await db.prepare("DELETE FROM whatsapp_crm_mensagens WHERE id = ?").bind(mensagem).run();
      throw new ErroCrm(502, "O WhatsApp recusou o envio. Confira a configuração e tente novamente.");
    }
  }

  try {
    await db.batch([
      db.prepare("UPDATE whatsapp_crm_mensagens SET estado_envio = 'registrada' WHERE id = ?").bind(mensagem),
      db.prepare(`UPDATE whatsapp_crm_conversas SET atualizado_em = MAX(atualizado_em, ?),
        status = CASE WHEN status = 'novo' THEN 'em_atendimento' ELSE status END WHERE id = ?`).bind(agora, id),
    ]);
  } catch {
    throw envioIncerto();
  }
}

function envioIncerto() {
  return new ErroCrm(409, "Envio sem confirmação. Confira a conversa no WhatsApp antes de reenviar.");
}
