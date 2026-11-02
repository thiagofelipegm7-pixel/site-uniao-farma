import type { Unit } from "./site-config";

/** Regras puras do seletor de bairro da página de entrega. Só usa bairros confirmados pelo dono (Unit.deliveryAreas). */
export type BairroEntrega = { bairro: string; unitId: Unit["id"] };

export function listarBairros(units: readonly Unit[]): BairroEntrega[] {
  return units
    .flatMap((unit) => unit.deliveryAreas.map((bairro) => ({ bairro, unitId: unit.id })))
    .sort((a, b) => a.bairro.localeCompare(b.bairro, "pt-BR"));
}

export function lojaDoBairro(units: readonly Unit[], bairro: string): Unit | null {
  return units.find((unit) => unit.deliveryAreas.includes(bairro)) ?? null;
}

export function mensagemEntrega(unit: Pick<Unit, "shortName">, bairro: string): string {
  return `Oi, União Farma ${unit.shortName}! Moro no bairro ${bairro} e quero fazer um pedido para entrega.`;
}

/** Evento da consulta de bairro. Não usa delivery_inquiry (esse conta como conversão no Google Ads). Sem o nome do bairro. */
export function eventoEntrega(unit: Pick<Unit, "id"> | null): { event: "delivery_check"; params: Record<string, unknown> } {
  return { event: "delivery_check", params: { source: "entrega_bairro", covered: unit !== null, ...(unit ? { unit: unit.id } : {}) } };
}
