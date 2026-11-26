/** Envia a cesta (com consentimento) para a equipe poder avisar se o pedido não fechar. Nada é disparado ao cliente. */
export function enviarCestaEsquecida(corpo: string): void {
  if (typeof window === "undefined" || !corpo) return;
  const enviado = navigator.sendBeacon?.("/api/cesta-esquecida", new Blob([corpo], { type: "application/json" })) ?? false;
  if (!enviado) {
    void fetch("/api/cesta-esquecida", { method: "POST", headers: { "content-type": "application/json" }, body: corpo, keepalive: true }).catch(() => {});
  }
}

export type ItemRetomada = {
  nome: string;
  quantidade: number;
  precoCentavos: number;
  foto?: string | null;
  slug?: string;
  unitId?: string;
  variante?: { id: string; nome: string };
};

export async function buscarCestaParaRetomar(id: string): Promise<ItemRetomada[] | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const resposta = await fetch(`/api/cesta-esquecida?cesta=${encodeURIComponent(id)}`, { cache: "no-store" });
  if (!resposta.ok) return null;
  const json = (await resposta.json()) as { ok?: boolean; itens?: ItemRetomada[] };
  return json.ok && Array.isArray(json.itens) ? json.itens : null;
}
