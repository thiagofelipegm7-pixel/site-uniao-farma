/**
 * Funil da cesta, sem dados pessoais: conta, por dia, quantas visitas chegaram a cada etapa (uma vez por visita).
 * Nada de nome, produto, endereço ou telefone: só o nome da etapa e a contagem do dia.
 */
export const ETAPAS_FUNIL = ["add", "cesta", "entrega", "finalizar", "enviar"] as const;
export type EtapaFunil = (typeof ETAPAS_FUNIL)[number];

export const ROTULO_ETAPA: Record<EtapaFunil, string> = {
  add: "Colocou um produto na cesta",
  cesta: "Abriu a cesta",
  entrega: "Chegou em entrega ou retirada",
  finalizar: "Chegou em revisar e enviar",
  enviar: "Tocou em enviar pelo WhatsApp",
};

export function etapaValida(valor: unknown): valor is EtapaFunil {
  return typeof valor === "string" && (ETAPAS_FUNIL as readonly string[]).includes(valor);
}

/** Registra a etapa no máximo uma vez por visita (aba aberta). Falha em silêncio: nunca atrapalha o pedido. */
export function registrarEtapa(etapa: EtapaFunil): void {
  if (typeof window === "undefined") return;
  try {
    const chave = `uf-funil-${etapa}`;
    if (window.sessionStorage.getItem(chave)) return;
    window.sessionStorage.setItem(chave, "1");
    const corpo = new Blob([JSON.stringify({ etapa })], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/funil", corpo)) {
      void fetch("/api/funil", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ etapa }), keepalive: true });
    }
  } catch {
    // sem armazenamento ou rede: só não conta
  }
}

export type LinhaFunil = { etapa: EtapaFunil; rotulo: string; total: number; /** % da etapa anterior (null na primeira) */ doAnterior: number | null; /** % de quem colocou na cesta */ doTopo: number | null };

/** Monta o funil a partir das contagens somadas por etapa. */
export function montarFunil(totais: Partial<Record<EtapaFunil, number>>): LinhaFunil[] {
  const topo = totais.add ?? 0;
  return ETAPAS_FUNIL.map((etapa, i) => {
    const total = totais[etapa] ?? 0;
    const anterior = i === 0 ? null : totais[ETAPAS_FUNIL[i - 1]] ?? 0;
    return {
      etapa,
      rotulo: ROTULO_ETAPA[etapa],
      total,
      doAnterior: anterior === null ? null : anterior > 0 ? Math.round((Math.min(total, anterior) / anterior) * 100) : null,
      doTopo: i === 0 ? null : topo > 0 ? Math.round((Math.min(total, topo) / topo) * 100) : null,
    };
  });
}
