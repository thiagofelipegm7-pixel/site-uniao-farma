/** Envia o clique ao contador próprio: só página, botão e loja. Sem cookie, ID ou IP. */
export function countClick(button: "whatsapp" | "ifood", store: string | undefined): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ path: window.location.pathname, button, store: store || "geral" });
  try {
    if (navigator.sendBeacon?.("/api/cliques", new Blob([payload], { type: "application/json" }))) return;
  } catch {
    // cai no fetch abaixo
  }
  void fetch("/api/cliques", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
    credentials: "omit",
  }).catch(() => undefined);
}
