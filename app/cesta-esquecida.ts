/**
 * Cesta esquecida: a equipe vê em /interno/vendas?aba=cestas e manda, à mão, um WhatsApp com o link para retomar.
 * Nada é enviado automaticamente. Só entra quem marcou a caixa (desmarcada por padrão) e informou o celular.
 * Medicamento, inclusive MIP, impede a cesta de entrar. Dados somem em 7 dias. Módulo sem Cloudflare (testável).
 */
import { type Banco } from "./nomes-corrigidos";
import { hashTelefone, linkWhatsApp, type Classificador } from "./recompra";
import { normalizarTelefone } from "./reserva/lembrete-recompra";

export { linkWhatsApp, normalizarTelefone };

export const TEXTO_CONSENTIMENTO_CESTA =
  "Se eu não terminar o pedido, a loja pode me chamar no WhatsApp com o link da cesta";

/** Tempo sem fechar o pedido para a cesta aparecer na lista da equipe. */
export const ESPERA_HORAS = 2;
export const ESPERA_MS = ESPERA_HORAS * 60 * 60 * 1000;
/** Nome, celular e itens somem depois deste prazo. */
export const RETENCAO_DIAS = 7;

/** Link humano do site (o punycode de SITE_URL é o mesmo endereço). */
export const SITE_LINK = "https://uniãofarmasabará.com.br";

export type ItemCestaEsquecida = {
  nome: string;
  quantidade: number;
  precoCentavos: number;
  foto?: string | null;
  slug?: string;
  unitId?: string;
  variante?: { id: string; nome: string };
};

export type ConsentimentoCesta = { nome: string; telefone: string };

export type LinhaCesta = {
  id: string;
  request_id: string;
  nome: string;
  telefone: string;
  consentido_em: string;
  status: string;
  itens_json: string;
  criado_em: string;
  atualizado_em: string;
};

export type CestaParaAvisar = {
  id: string;
  nome: string;
  telefone: string;
  atualizadoEm: string;
  horasDesde: number;
  produtos: string[];
  mensagem: string;
  link: string;
  retomada: string;
};

export type ListaCestasEsquecidas = { pendentes: CestaParaAvisar[]; enviadas: number; descartadas: number };

export function limparNome(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const n = bruto.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return n.length >= 2 ? n : null;
}

/** Só vale com consentimento === true, nome e celular válidos. */
export function validarConsentimentoCesta(entrada: unknown): ConsentimentoCesta | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as { consentimento?: unknown; nome?: unknown; telefone?: unknown };
  if (e.consentimento !== true) return null;
  const nome = limparNome(e.nome);
  const telefone = normalizarTelefone(e.telefone);
  return nome && telefone ? { nome, telefone } : null;
}

export function validarItensCesta(entrada: unknown): ItemCestaEsquecida[] | null {
  if (!Array.isArray(entrada) || entrada.length < 1 || entrada.length > 40) return null;
  const itens: ItemCestaEsquecida[] = [];
  for (const valor of entrada) {
    if (!valor || typeof valor !== "object") return null;
    const v = valor as Record<string, unknown>;
    const nome = typeof v.nome === "string" ? v.nome.replace(/\s+/g, " ").trim().slice(0, 180) : "";
    const quantidade = v.quantidade;
    const precoCentavos = v.precoCentavos;
    if (!nome || !Number.isInteger(quantidade) || Number(quantidade) < 1 || Number(quantidade) > 20 || !Number.isInteger(precoCentavos) || Number(precoCentavos) < 1 || Number(precoCentavos) > 10_000_000) {
      return null;
    }
    const item: ItemCestaEsquecida = { nome, quantidade: Number(quantidade), precoCentavos: Number(precoCentavos) };
    if (typeof v.foto === "string" && v.foto.startsWith("/") && v.foto.length < 300) item.foto = v.foto;
    if (typeof v.slug === "string" && /^[a-z0-9-]{1,180}$/.test(v.slug)) item.slug = v.slug;
    if (typeof v.unitId === "string" && /^(fatima|nacoes|itacolomi)$/.test(v.unitId)) item.unitId = v.unitId;
    if (v.variante && typeof v.variante === "object") {
      const vari = v.variante as { id?: unknown; nome?: unknown };
      if (typeof vari.id === "string" && typeof vari.nome === "string" && vari.id.length <= 80 && vari.nome.length <= 180) {
        item.variante = { id: vari.id, nome: vari.nome };
      }
    }
    itens.push(item);
  }
  return itens;
}

/**
 * A opção mais segura pela Anvisa e pela LGPD: se qualquer item for medicamento (inclusive MIP),
 * não estiver no catálogo, for sensível ou não for claramente um item permitido, a cesta inteira fica de fora.
 * Não adianta só omitir o remédio da mensagem: o link de retomar ainda levaria o cliente a uma cesta com medicamento.
 */
export function cestaPodeSerLembrada(itens: readonly { nome: string }[], classificar: Classificador): { ok: true } | { ok: false; motivo: "vazia" | "medicamento" } {
  if (!itens.length) return { ok: false, motivo: "vazia" };
  for (const item of itens) {
    if (!classificar(item.nome)) return { ok: false, motivo: "medicamento" };
  }
  return { ok: true };
}

export function linkRetomada(id: string, base: string = SITE_LINK): string {
  return `${base}/reserva?cesta=${encodeURIComponent(id)}`;
}

const titulo = (t: string) => t.toLocaleLowerCase("pt-BR").replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("pt-BR"));

/** Mensagem pronta: curta, sem citar produto, sem preço, sem promessa e sem desconto; sempre com o jeito de sair. */
export function mensagemCestaEsquecida(nome: string, link: string): string {
  const primeiro = titulo(nome.trim().split(/\s+/)[0] || "oi");
  return `Oi, ${primeiro}! Aqui é da União Farma Sabará. Você deixou uma cesta no site e não terminou o pedido. Se ainda quiser, retome por aqui: ${link}\n\nSe não quiser mais avisos, responda SAIR.`;
}

export async function garantirTabelas(db: Banco): Promise<void> {
  await db.exec(
    "CREATE TABLE IF NOT EXISTS cesta_esquecida (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, nome TEXT NOT NULL, telefone TEXT NOT NULL, consentimento_texto TEXT NOT NULL, consentido_em TEXT NOT NULL, itens_json TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'aberta', criado_em TEXT NOT NULL, atualizado_em TEXT NOT NULL)",
  );
  await db.exec("CREATE INDEX IF NOT EXISTS cesta_esquecida_telefone ON cesta_esquecida (telefone)");
  await db.exec("CREATE INDEX IF NOT EXISTS cesta_esquecida_status_atualizado ON cesta_esquecida (status, atualizado_em)");
}

export async function limparExpiradas(db: Banco, agora: Date): Promise<void> {
  const limite = new Date(agora.getTime() - RETENCAO_DIAS * 86_400_000).toISOString();
  await db.prepare("DELETE FROM cesta_esquecida WHERE criado_em < ?").bind(limite).run();
}

function nomesDosItens(itensJson: string): string[] {
  try {
    const p: unknown = JSON.parse(itensJson);
    if (!Array.isArray(p)) return [];
    const nomes: string[] = [];
    for (const it of p) {
      if (it && typeof it === "object" && typeof (it as { nome?: unknown }).nome === "string") {
        const nome = (it as { nome: string }).nome.trim();
        if (nome && !nomes.includes(nome)) nomes.push(nome);
      }
    }
    return nomes;
  } catch {
    return [];
  }
}

/** Monta a lista da equipe (função pura). Uma cesta por telefone, a mais recente. */
export function montarListaCestas(
  linhas: readonly LinhaCesta[],
  agoraMs: number,
  bloqueados: ReadonlySet<string> = new Set(),
): CestaParaAvisar[] {
  const jaAvisado = new Set<string>();
  for (const l of linhas) {
    if (l.status === "enviada" && l.telefone) jaAvisado.add(l.telefone);
  }
  const ultimaAberta = new Map<string, LinhaCesta>();
  for (const l of linhas) {
    if (l.status !== "aberta" || !l.telefone || bloqueados.has(l.telefone) || jaAvisado.has(l.telefone)) continue;
    const atual = ultimaAberta.get(l.telefone);
    if (!atual || Date.parse(l.atualizado_em) > Date.parse(atual.atualizado_em)) ultimaAberta.set(l.telefone, l);
  }
  const lista: CestaParaAvisar[] = [];
  for (const l of ultimaAberta.values()) {
    const atualizado = Date.parse(l.atualizado_em);
    if (!Number.isFinite(atualizado) || agoraMs - atualizado < ESPERA_MS) continue;
    const produtos = nomesDosItens(l.itens_json);
    if (!produtos.length) continue;
    const retomada = linkRetomada(l.id);
    const mensagem = mensagemCestaEsquecida(l.nome, retomada);
    lista.push({
      id: l.id,
      nome: l.nome,
      telefone: l.telefone,
      atualizadoEm: l.atualizado_em,
      horasDesde: Math.max(1, Math.floor((agoraMs - atualizado) / 3_600_000)),
      produtos,
      mensagem,
      link: linkWhatsApp(l.telefone, mensagem),
      retomada,
    });
  }
  return lista.sort((a, b) => b.horasDesde - a.horasDesde || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function gravarCestaEsquecida(
  db: Banco,
  entrada: { requestId: string; consentimento: ConsentimentoCesta; itens: ItemCestaEsquecida[]; classificar: Classificador },
  agora: Date,
): Promise<{ ok: true; id: string } | { ok: false; motivo: "medicamento" | "bloqueado" | "ja_avisado" | "encerrada" }> {
  await garantirTabelas(db);
  await limparExpiradas(db, agora);
  if (!cestaPodeSerLembrada(entrada.itens, entrada.classificar).ok) return { ok: false, motivo: "medicamento" };
  const quando = agora.toISOString();
  const { nome, telefone } = entrada.consentimento;
  const { results: optouts } = await db.prepare("SELECT telefone_hash, criado_em FROM recompra_optout").bind().all<{ telefone_hash: string; criado_em: string }>();
  const hash = await hashTelefone(telefone);
  const bloqueio = optouts.find((o) => o.telefone_hash === hash);
  if (bloqueio) return { ok: false, motivo: "bloqueado" };

  const existente = await db
    .prepare("SELECT id, status FROM cesta_esquecida WHERE request_id = ?")
    .bind(entrada.requestId)
    .first<{ id: string; status: string }>();
  if (existente) {
    if (existente.status !== "aberta") return { ok: false, motivo: "encerrada" };
    await db
      .prepare("UPDATE cesta_esquecida SET nome = ?, telefone = ?, itens_json = ?, atualizado_em = ? WHERE id = ? AND status = 'aberta'")
      .bind(nome, telefone, JSON.stringify(entrada.itens), quando, existente.id)
      .run();
    return { ok: true, id: existente.id };
  }

  const jaEnviada = await db
    .prepare("SELECT id FROM cesta_esquecida WHERE telefone = ? AND status = 'enviada' AND criado_em >= ? LIMIT 1")
    .bind(telefone, new Date(agora.getTime() - RETENCAO_DIAS * 86_400_000).toISOString())
    .first<{ id: string }>();
  if (jaEnviada) return { ok: false, motivo: "ja_avisado" };

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO cesta_esquecida (id, request_id, nome, telefone, consentimento_texto, consentido_em, itens_json, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 'aberta', ?, ?)",
    )
    .bind(id, entrada.requestId, nome, telefone, TEXTO_CONSENTIMENTO_CESTA, quando, JSON.stringify(entrada.itens), quando, quando)
    .run();
  return { ok: true, id };
}

export async function itensParaRetomada(db: Banco, id: string, agora: Date): Promise<ItemCestaEsquecida[] | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  await garantirTabelas(db);
  await limparExpiradas(db, agora);
  const linha = await db
    .prepare("SELECT itens_json, status FROM cesta_esquecida WHERE id = ?")
    .bind(id)
    .first<{ itens_json: string; status: string }>();
  if (!linha || (linha.status !== "aberta" && linha.status !== "enviada")) return null;
  return validarItensCesta((() => {
    try {
      return JSON.parse(linha.itens_json);
    } catch {
      return null;
    }
  })());
}

export async function listarCestasEsquecidas(db: Banco, agoraMs: number): Promise<ListaCestasEsquecidas> {
  const agora = new Date(agoraMs);
  await garantirTabelas(db);
  await limparExpiradas(db, agora);
  const limite = new Date(agoraMs - RETENCAO_DIAS * 86_400_000).toISOString();
  const { results } = await db
    .prepare("SELECT id, request_id, nome, telefone, consentido_em, status, itens_json, criado_em, atualizado_em FROM cesta_esquecida WHERE criado_em >= ? LIMIT 1000")
    .bind(limite)
    .all<LinhaCesta>();
  const { results: bloqueios } = await db.prepare("SELECT telefone_hash, criado_em FROM recompra_optout").bind().all<{ telefone_hash: string; criado_em: string }>();
  const quandoBloqueou = new Map(bloqueios.map((b) => [b.telefone_hash, b.criado_em]));
  const bloqueados = new Set<string>();
  for (const l of results) {
    if (!l.telefone) continue;
    const em = quandoBloqueou.get(await hashTelefone(l.telefone));
    if (em && l.consentido_em <= em) bloqueados.add(l.telefone);
  }
  return {
    pendentes: montarListaCestas(results, agoraMs, bloqueados),
    enviadas: results.filter((l) => l.status === "enviada").length,
    descartadas: results.filter((l) => l.status === "descartada").length,
  };
}

export async function marcarCesta(db: Banco, id: string, acao: "enviada" | "descartada", agora: Date): Promise<boolean> {
  await garantirTabelas(db);
  const linha = await db.prepare("SELECT id, status FROM cesta_esquecida WHERE id = ?").bind(id).first<{ id: string; status: string }>();
  if (!linha || linha.status !== "aberta") return false;
  const quando = agora.toISOString();
  if (acao === "descartada") {
    await db
      .prepare("UPDATE cesta_esquecida SET status = 'descartada', nome = '', telefone = '', itens_json = '[]', atualizado_em = ? WHERE id = ? AND status = 'aberta'")
      .bind(quando, id)
      .run();
    return true;
  }
  await db.prepare("UPDATE cesta_esquecida SET status = 'enviada', atualizado_em = ? WHERE id = ? AND status = 'aberta'").bind(quando, id).run();
  return true;
}

/** Sai da lista quando a cesta vira pedido (mesma visita ou o mesmo celular). */
export async function marcarCestaConvertida(db: Banco, chaves: { requestId?: string; telefone?: string | null }, agora: Date): Promise<void> {
  await garantirTabelas(db);
  const quando = agora.toISOString();
  if (chaves.requestId && /^[0-9a-f-]{36}$/i.test(chaves.requestId)) {
    await db
      .prepare("UPDATE cesta_esquecida SET status = 'convertida', nome = '', telefone = '', itens_json = '[]', atualizado_em = ? WHERE request_id = ? AND status = 'aberta'")
      .bind(quando, chaves.requestId)
      .run();
  }
  if (chaves.telefone) {
    await db
      .prepare("UPDATE cesta_esquecida SET status = 'convertida', nome = '', telefone = '', itens_json = '[]', atualizado_em = ? WHERE telefone = ? AND status = 'aberta'")
      .bind(quando, chaves.telefone)
      .run();
  }
}

export function origemPermitida(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return true;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

