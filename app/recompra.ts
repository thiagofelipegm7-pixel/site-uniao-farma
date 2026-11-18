/**
 * Lembrete de recompra (/interno/recompra). Só para quem marcou, no checkout, a caixa (desmarcada por padrão) pedindo lembrete
 * pelo WhatsApp. Lista quem levou, há uns 30 dias, produto de uso contínuo que NÃO é medicamento (fralda, higiene, dermocosmético,
 * perfumaria, suplemento alimentar). Todo medicamento fica de fora, inclusive MIP. Nada é enviado sozinho: o operador abre o
 * WhatsApp com a mensagem pronta e envia ele mesmo. "Não quer mais" (SAIR) apaga nome e telefone e bloqueia o número.
 * Módulo sem Cloudflare (testável).
 */
import { chaveDoNome, type Banco } from "./nomes-corrigidos";
import { ANTIMICROB } from "./nacoes-unidas/produtos/sem-venda";

import { normalizarTelefone, TEXTO_CONSENTIMENTO } from "./reserva/lembrete-recompra";

export { normalizarTelefone, TEXTO_CONSENTIMENTO };

/** Dias até lembrar, por categoria do site. Padrão: 30. Mude aqui para ajustar uma categoria (ex.: fralda 25). */
export const DIAS_PADRAO = 30;
export const DIAS_RECOMPRA_POR_CATEGORIA: Readonly<Record<string, number>> = {
  "Infantil e Gestante": 30,
  "Cuidado Diário": 30,
  "Dermocosméticos": 30,
  "Beleza": 30,
  "Perfumes": 30,
  "Bem Estar": 30,
};
/** Depois de vencer, o lembrete fica na lista por mais estes dias (depois disso some: já passou da hora). */
export const JANELA_DIAS = 15;
/** Nome e telefone de quem pediu lembrete somem junto com a cesta, em 90 dias. */
export const RETENCAO_DIAS = 90;

/** Só estas categorias podem ter lembrete. "Medicamentos" e "Categoria a conferir" nunca. */
const CATEGORIAS_RECOMPRA = new Set(Object.keys(DIAS_RECOMPRA_POR_CATEGORIA));

export function diasDaCategoria(categoria: string): number {
  const d = DIAS_RECOMPRA_POR_CATEGORIA[categoria];
  return Number.isInteger(d) && d > 0 ? d : DIAS_PADRAO;
}

const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Sinais de medicamento no nome, para pegar o que o sistema da loja deixou fora de "Medicamentos" (ex.: creme com princípio ativo
 * em "Bem Estar", vitamina D em UI, spray com dose). Na dúvida, fica de fora: o lembrete é só para o que claramente não é remédio.
 */
const FORMA_DE_REMEDIO = /\b(pomadas?|pom|xaropes?|colirios?|supositorios?|ovulos?|ampolas?|injet\w*|comprimidos?|comp|cpr|drageas?|gotas|gts|sol oral|solucao oral|suspensao|susp|elixir|crem derm|creme derm|derm|otc|mip|generico|similar|bula)\b/;
const DOSE_DE_REMEDIO = /(\d\s*(mg|mcg|ui|g)\s*\/\s*(ml|g|gota)\b)|(\d[\d.]*\s*ui\b)|(\d[\d.,]*\s*\+\s*\d[\d.,]*\s*mg\b)/;
const PRINCIPIO_ATIVO = /\b(dipirona|paracetamol|ibuprofeno|nimesulida|diclofenaco|cetoprofeno|naproxeno|prometazina|dexclorfeniramina|loratadina|desloratadina|cetirizina|simeticona|dimeticona|bromoprida|domperidona|omeprazol|pantoprazol|ranitidina|loperamida|bisacodil|lactulose|cetoconazol|miconazol|clotrimazol|terbinafina|nistatina|dexametasona|betametasona|hidrocortisona|neomicina|bacitracina|sulfadiazina|lidocaina|benzocaina|minoxidil|finasterida|sildenafila|tadalafila|ivermectina|albendazol|mebendazol|nitazoxanida|aciclovir|budesonida|salbutamol|ambroxol|bromexina|acetilcisteina|guaifenesina|fenilefrina|nafazolina|oximetazolina|cloreto de sodio nasal|hioscina|escopolamina|butilbrometo|metoclopramida|ondansetrona|insulina|losartana|metformina|levotiroxina|sinvastatina|captopril|enalapril|atenolol|hidroclorotiazida|anlodipino|clonazepam|alprazolam|diazepam|sertralina|fluoxetina|amitriptilina|isotretinoina|tretinoina|adapaleno|permetrina|deltametrina|piretrina|neopiridin|tilemaxy|deltapil|degen|camomine|depura|addera|dramin|buscopan|dorflex|neosaldina|benegrip|cimegripe|resfenol|vick vaporub|gelol|calminex|salonpas|cataflam|voltaren|nebacetin|bepantol derma|hipoglos|dermodex|trok|nizoral|vodol|gino|fluimucil|mucosolvan|sorine|rinosoro|neosoro|luftal|eno|estomazil|sal de fruta|engov|epocler|tamarine|lacto purga|dulcolax|imosec|floratil|repoflor|enterogermina|biovicerin|histamin|polaramine|allegra|claritin|pastilhas?|antissep\w*|antisep\w*|clorexidina|iodo|povidine|merthiolate|soro reidrat\w*|reidrat\w*|queimadol|gengicalm|ciflogex|agua oxigenada)\b/;
/** Produto que revela saúde íntima ou doença na conversa (gravidez, sexo, diabetes): fica fora para o lembrete não expor o cliente. */
const SENSIVEL = /\b(autoteste|hiv|gravidez|ovulacao|fertilidade|preserv\w*|lubrific\w*|glicose|glicemia|lancet\w*|insulina|covid|seringas?|agulhas?)\b/;

export type MotivoFora = "nao_achado" | "medicamento" | "categoria" | "nome_de_remedio" | "sensivel";

/** Um item de catálogo pode ter lembrete? Medicamento (categoria, MIP, antimicrobiano ou nome de remédio) nunca. */
export function podeTerLembrete(item: { nome: string; categoria: string; isMIP: boolean } | null): { ok: true } | { ok: false; motivo: MotivoFora } {
  if (!item) return { ok: false, motivo: "nao_achado" };
  if (item.isMIP || item.categoria === "Medicamentos" || ANTIMICROB.test(item.nome.toUpperCase())) return { ok: false, motivo: "medicamento" };
  if (!CATEGORIAS_RECOMPRA.has(item.categoria)) return { ok: false, motivo: "categoria" };
  const n = sem(item.nome).replace(/[^a-z0-9.,/+ ]+/g, " ");
  if (FORMA_DE_REMEDIO.test(n) || DOSE_DE_REMEDIO.test(n) || PRINCIPIO_ATIVO.test(n)) return { ok: false, motivo: "nome_de_remedio" };
  if (SENSIVEL.test(n)) return { ok: false, motivo: "sensivel" };
  return { ok: true };
}

export type ItemCatalogoRecompra = { nome: string; categoria: string; isMIP: boolean };

/**
 * Índice do catálogo para achar o item da cesta. O nome na cesta pode ser o corrigido pelo painel: `nomesCorrigidos` traz
 * chave do original → nome novo; `categorias` traz chave do original → categoria trocada pela equipe.
 */
export function criarClassificador(
  catalogo: readonly ItemCatalogoRecompra[],
  nomesCorrigidos: Readonly<Record<string, { nome: string }>> = {},
  categorias: Readonly<Record<string, { categoria: string }>> = {},
) {
  const porChave = new Map<string, ItemCatalogoRecompra>();
  for (const item of catalogo) porChave.set(chaveDoNome(item.nome), item);
  const original = new Map<string, string>();
  for (const [chave, v] of Object.entries(nomesCorrigidos)) original.set(chaveDoNome(v.nome), chave);
  return (nomeNaCesta: string): (ItemCatalogoRecompra & { dias: number }) | null => {
    const k = chaveDoNome(nomeNaCesta);
    const chave = porChave.has(k) ? k : original.get(k);
    const item = chave ? porChave.get(chave) : undefined;
    if (!item || !chave) return null;
    const categoria = categorias[chave]?.categoria ?? item.categoria;
    const final = { ...item, categoria };
    return podeTerLembrete(final).ok ? { ...final, dias: diasDaCategoria(categoria) } : null;
  };
}
export type Classificador = ReturnType<typeof criarClassificador>;

export function limparNome(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const n = bruto.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  return n.length >= 2 ? n : null;
}

export type Lembrete = { nome: string; telefone: string };

/** Só vale com consentimento === true, nome e celular válidos. */
export function validarLembrete(entrada: unknown): Lembrete | null {
  if (!entrada || typeof entrada !== "object") return null;
  const e = entrada as { consentimento?: unknown; nome?: unknown; telefone?: unknown };
  if (e.consentimento !== true) return null;
  const nome = limparNome(e.nome);
  const telefone = normalizarTelefone(e.telefone);
  return nome && telefone ? { nome, telefone } : null;
}

const titulo = (t: string) => t.toLocaleLowerCase("pt-BR").replace(/(^|\s)(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase("pt-BR"));

/** Texto do lembrete: sem preço, sem promessa, sem falar de saúde; sempre com o jeito de sair. */
export function mensagemRecompra(nome: string, produtos: readonly string[]): string {
  const primeiro = titulo(nome.trim().split(/\s+/)[0] || "tudo bem");
  const lista = produtos.map((p) => p.trim()).filter(Boolean);
  const oQue = lista.length <= 1 ? (lista[0] ?? "seus produtos") : lista.length === 2 ? `${lista[0]} e ${lista[1]}` : `${lista[0]} e mais ${lista.length - 1} itens`;
  return `Oi, ${primeiro}! Aqui é da União Farma Sabará. Faz um tempinho que você levou ${oQue}. Se quiser repor, é só responder aqui ou pedir pelo site. Para não receber mais lembretes, responda SAIR.`;
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
}

export async function hashTelefone(telefone: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`uf-recompra:${telefone}`));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- Banco (D1, binding DB que já existe; tabelas criadas sob demanda como as outras do site). ----

export async function garantirTabelas(db: Banco): Promise<void> {
  await db.exec("CREATE TABLE IF NOT EXISTS recompra_contato (pre_venda_id TEXT PRIMARY KEY, nome TEXT NOT NULL, telefone TEXT NOT NULL, consentimento_texto TEXT NOT NULL, consentido_em TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente', atualizado_em TEXT NOT NULL)");
  await db.exec("CREATE INDEX IF NOT EXISTS recompra_contato_telefone ON recompra_contato (telefone)");
  await db.exec("CREATE TABLE IF NOT EXISTS recompra_optout (telefone_hash TEXT PRIMARY KEY, criado_em TEXT NOT NULL)");
}

/** Guarda o consentimento junto com a cesta (mesmo id da pre_venda). */
export async function gravarConsentimento(db: Banco, preVendaId: string, lembrete: Lembrete, agora: Date): Promise<void> {
  await garantirTabelas(db);
  const quando = agora.toISOString();
  await db.prepare("DELETE FROM recompra_contato WHERE consentido_em < ?").bind(new Date(agora.getTime() - RETENCAO_DIAS * 86_400_000).toISOString()).run();
  await db
    .prepare("INSERT OR IGNORE INTO recompra_contato (pre_venda_id, nome, telefone, consentimento_texto, consentido_em, status, atualizado_em) VALUES (?, ?, ?, ?, ?, 'pendente', ?)")
    .bind(preVendaId, lembrete.nome, lembrete.telefone, TEXTO_CONSENTIMENTO, quando, quando)
    .run();
}

type LinhaContato = { pre_venda_id: string; nome: string; telefone: string; consentido_em: string; status: string; criado_em: string; itens_json: string; status_pedido: string };

export type Lembrar = {
  id: string;
  nome: string;
  telefone: string;
  pedidoEm: string;
  diasDesde: number;
  produtos: string[];
  mensagem: string;
  link: string;
};
export type ListaRecompra = { pendentes: Lembrar[]; enviados: number; optouts: number };

/** Monta a lista do dia (função pura: recebe as linhas já lidas). Um lembrete por telefone, pela cesta mais recente. */
export function montarLista(linhas: readonly LinhaContato[], agoraMs: number, classificar: Classificador, bloqueados: ReadonlySet<string> = new Set()): Lembrar[] {
  const ultimaPorTelefone = new Map<string, LinhaContato>();
  for (const l of linhas) {
    if (!l.telefone || l.status === "optout" || l.status_pedido === "cancelada") continue;
    const atual = ultimaPorTelefone.get(l.telefone);
    if (!atual || Date.parse(l.criado_em) > Date.parse(atual.criado_em)) ultimaPorTelefone.set(l.telefone, l);
  }
  const lista: Lembrar[] = [];
  for (const l of ultimaPorTelefone.values()) {
    if (l.status !== "pendente" || bloqueados.has(l.telefone)) continue;
    const dias = Math.floor((agoraMs - Date.parse(l.criado_em)) / 86_400_000);
    if (!Number.isFinite(dias)) continue;
    let itens: Array<{ nome?: unknown }> = [];
    try {
      const p: unknown = JSON.parse(l.itens_json);
      if (Array.isArray(p)) itens = p as typeof itens;
    } catch {
      continue;
    }
    const produtos: string[] = [];
    for (const it of itens) {
      if (typeof it?.nome !== "string") continue;
      const c = classificar(it.nome);
      if (c && dias >= c.dias && dias <= c.dias + JANELA_DIAS && !produtos.includes(it.nome)) produtos.push(it.nome);
    }
    if (!produtos.length) continue;
    const mensagem = mensagemRecompra(l.nome, produtos);
    lista.push({ id: l.pre_venda_id, nome: l.nome, telefone: l.telefone, pedidoEm: l.criado_em, diasDesde: dias, produtos, mensagem, link: linkWhatsApp(l.telefone, mensagem) });
  }
  return lista.sort((a, b) => b.diasDesde - a.diasDesde || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function lerListaRecompra(db: Banco, agoraMs: number, classificar: Classificador): Promise<ListaRecompra> {
  await garantirTabelas(db);
  const limite = new Date(agoraMs - RETENCAO_DIAS * 86_400_000).toISOString();
  await db.prepare("DELETE FROM recompra_contato WHERE consentido_em < ?").bind(limite).run();
  const { results } = await db
    .prepare("SELECT c.pre_venda_id, c.nome, c.telefone, c.consentido_em, c.status, p.criado_em, p.itens_json, p.status AS status_pedido FROM recompra_contato c JOIN pre_venda p ON p.id = c.pre_venda_id WHERE p.criado_em >= ? LIMIT 3000")
    .bind(limite)
    .all<LinhaContato>();
  const { results: bloqueios } = await db.prepare("SELECT telefone_hash, criado_em FROM recompra_optout").bind().all<{ telefone_hash: string; criado_em: string }>();
  const quandoBloqueou = new Map(bloqueios.map((b) => [b.telefone_hash, b.criado_em]));
  const bloqueados = new Set<string>();
  for (const l of results) {
    if (!l.telefone) continue;
    const em = quandoBloqueou.get(await hashTelefone(l.telefone));
    // Novo consentimento marcado depois do SAIR vale de novo; o anterior não.
    if (em && l.consentido_em <= em) bloqueados.add(l.telefone);
  }
  return {
    pendentes: montarLista(results, agoraMs, classificar, bloqueados),
    enviados: results.filter((l) => l.status === "enviado").length,
    optouts: bloqueios.length,
  };
}

/** "enviado": some da lista. "optout": bloqueia o número e apaga nome e telefone de todas as cestas dele. */
export async function marcarRecompra(db: Banco, id: string, acao: "enviado" | "optout", agora: Date): Promise<boolean> {
  await garantirTabelas(db);
  const linha = await db.prepare("SELECT telefone FROM recompra_contato WHERE pre_venda_id = ?").bind(id).first<{ telefone: string }>();
  if (!linha) return false;
  const quando = agora.toISOString();
  if (acao === "enviado") {
    await db.prepare("UPDATE recompra_contato SET status = 'enviado', atualizado_em = ? WHERE pre_venda_id = ? AND status = 'pendente'").bind(quando, id).run();
    return true;
  }
  if (linha.telefone) {
    await db.prepare("INSERT OR REPLACE INTO recompra_optout (telefone_hash, criado_em) VALUES (?, ?)").bind(await hashTelefone(linha.telefone), quando).run();
    await db.prepare("UPDATE recompra_contato SET status = 'optout', nome = '', telefone = '', atualizado_em = ? WHERE telefone = ?").bind(quando, linha.telefone).run();
  }
  await db.prepare("UPDATE recompra_contato SET status = 'optout', nome = '', telefone = '', atualizado_em = ? WHERE pre_venda_id = ?").bind(quando, id).run();
  return true;
}
