/**
 * Retirada no balcão: pedidos do site que o cliente vai buscar na loja (pre_venda.modo = "retirar").
 * O painel /interno/pedidos lista as retiradas em aberto com o botão "Avisar que está pronto", que só ABRE o WhatsApp
 * (wa.me) com a mensagem pronta: nada é enviado sozinho, quem envia é a equipe.
 * O WhatsApp do cliente só existe se ele informou no checkout (campo opcional) e é apagado quando a pré-venda é concluída
 * ou cancelada (e, de qualquer forma, em 90 dias com a pré-venda). Módulo sem Cloudflare (testável).
 */
import { normalizarTelefone } from "./reserva/lembrete-recompra";
import type { Banco } from "./nomes-corrigidos";
import { UNITS, type Unit } from "./site-config";

export const TEXTO_AVISO_RETIRADA = "Seu WhatsApp para avisarmos quando o pedido estiver pronto";
export const AJUDA_AVISO_RETIRADA = "Opcional. Usamos só para este aviso, sem propaganda. O número é apagado quando você retira o pedido (no máximo em 90 dias).";

/** Colunas novas da pre_venda. Linhas antigas ficam sem telefone e sem marca de receita. */
const COLUNAS: ReadonlyArray<readonly [string, string]> = [
  ["aviso_telefone", "TEXT"],
  ["com_receita", "INTEGER NOT NULL DEFAULT 0"],
];

let colunasProntas = false;

/** Garante as colunas da retirada na pre_venda (a tabela já precisa existir). */
export async function garantirColunasRetirada(db: Banco) {
  if (colunasProntas) return;
  const { results } = await db.prepare("PRAGMA table_info(pre_venda)").bind().all<{ name: string }>();
  const existentes = new Set(results.map((c) => c.name));
  for (const [coluna, tipo] of COLUNAS) {
    if (existentes.has(coluna)) continue;
    try {
      await db.exec(`ALTER TABLE pre_venda ADD COLUMN ${coluna} ${tipo}`);
    } catch (e) {
      // Outra requisição pode ter criado a coluna ao mesmo tempo.
      if (!/duplicate column/i.test(String(e))) throw e;
    }
  }
  colunasProntas = true;
}

/** Só para os testes (o banco falso muda entre um teste e outro). */
export function esquecerColunasRetirada() {
  colunasProntas = false;
}

/** Telefone do aviso: só em retirada e só celular brasileiro válido ("55DDNNNNNNNNN"). */
export function telefoneDoAviso(modo: string, bruto: unknown): string | null {
  return modo === "retirar" ? normalizarTelefone(bruto) : null;
}

export function unidadeDaRetirada(id: string): Unit {
  return UNITS.find((u) => u.id === id) ?? UNITS.find((u) => u.id === "nacoes") ?? UNITS[0];
}

/**
 * Mensagem de "pedido pronto". Endereço e nome da loja vêm de site-config.ts.
 * Sem preço, sem nome de produto e sem falar de saúde: só que está pronto, onde retirar e, se tiver item com receita, trazer a receita.
 */
export function mensagemPronto(p: { codigo: string; unidade: string; comReceita: boolean }): string {
  const loja = unidadeDaRetirada(p.unidade);
  return [
    `Olá! Aqui é da União Farma ${loja.shortName}.`,
    `Seu pedido ${p.codigo} já está pronto para retirada no balcão: ${loja.address}.`,
    ...(p.comReceita ? ["Não esqueça de trazer a receita para retirar o medicamento."] : []),
    "O pagamento é feito na loja, na hora da retirada. Até já!",
  ].join("\n");
}

/** Link do WhatsApp: com o número do cliente, abre a conversa dele; sem número, abre o WhatsApp para a equipe escolher a conversa. */
export function linkAvisoPronto(telefone: string | null, mensagem: string): string {
  const numero = telefone && /^55\d{10,11}$/.test(telefone) ? telefone : "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export type Retirada = {
  id: string;
  codigo: string;
  unidade: string;
  lojaNome: string;
  status: "nova" | "atendimento";
  criadoEm: string;
  itens: number;
  totalCentavos: number | null;
  comReceita: boolean;
  temWhatsapp: boolean;
  linkPronto: string;
};

/** Retiradas em aberto (nova ou em atendimento) dos últimos 7 dias, mais recentes primeiro. */
export async function lerRetiradas(db: Banco, agoraMs: number): Promise<Retirada[]> {
  await garantirColunasRetirada(db);
  const desde = new Date(agoraMs - 7 * 86_400_000).toISOString();
  const { results } = await db
    .prepare("SELECT id, codigo, unidade, status, criado_em, itens_json, total_centavos, aviso_telefone, com_receita FROM pre_venda WHERE modo = 'retirar' AND status IN ('nova', 'atendimento') AND criado_em >= ? ORDER BY criado_em DESC LIMIT 50")
    .bind(desde)
    .all<{ id: string; codigo: string; unidade: string; status: string; criado_em: string; itens_json: string; total_centavos: number; aviso_telefone: string | null; com_receita: number | null }>();
  return results.flatMap((l) => {
    if (typeof l.codigo !== "string" || !/^[A-Z0-9]{4}$/.test(l.codigo) || !Number.isFinite(Date.parse(l.criado_em))) return [];
    let itens = 0;
    try {
      const bruto: unknown = JSON.parse(String(l.itens_json ?? "[]"));
      itens = Array.isArray(bruto) ? bruto.reduce((s: number, i: { quantidade?: unknown }) => s + (Number.isInteger(i?.quantidade) ? Number(i.quantidade) : 0), 0) : 0;
    } catch {
      itens = 0;
    }
    const telefone = normalizarTelefone(l.aviso_telefone ?? "");
    const comReceita = Number(l.com_receita) === 1;
    const total = Number(l.total_centavos);
    return [{
      id: l.id,
      codigo: l.codigo,
      unidade: l.unidade,
      lojaNome: unidadeDaRetirada(l.unidade).shortName,
      status: l.status === "atendimento" ? "atendimento" : "nova",
      criadoEm: l.criado_em,
      itens,
      totalCentavos: Number.isSafeInteger(total) && total > 0 ? total : null,
      comReceita,
      temWhatsapp: telefone !== null,
      linkPronto: linkAvisoPronto(telefone, mensagemPronto({ codigo: l.codigo, unidade: l.unidade, comReceita })),
    } satisfies Retirada];
  });
}
