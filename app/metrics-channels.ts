export type ChannelKey =
  | "all"
  | "home"
  | "ofertas"
  | "receita"
  | "lojas"
  | "fab"
  | "header"
  | "footer"
  | "staff"
  | "webhook"
  | "other";

export const CHANNEL_LABEL: Record<ChannelKey, string> = {
  all: "Todos os canais",
  home: "Início",
  ofertas: "Ofertas",
  receita: "Receita",
  lojas: "Lojas",
  fab: "Balão WhatsApp",
  header: "Cabeçalho",
  footer: "Rodapé",
  staff: "Painel interno",
  webhook: "WhatsApp recebido",
  other: "Outros",
};

export function sourceToChannel(source: string): ChannelKey {
  const value = source.toLowerCase();
  if (value.includes("webhook")) return "webhook";
  if (value.includes("staff")) return "staff";
  if (value.includes("footer")) return "footer";
  if (value.includes("header")) return "header";
  if (value.includes("fab") || value.includes("balao") || value.includes("float")) return "fab";
  if (value.includes("oferta")) return "ofertas";
  if (value.includes("recipe") || value.includes("receita")) return "receita";
  if (value.includes("unit") || value.includes("loja") || value.includes("showcase") || value.includes("gondola")) {
    return "lojas";
  }
  if (value.includes("home") || value.includes("hero") || value.includes("inicio")) return "home";
  return "other";
}

export function splitSourceKey(key: string) {
  const split = key.indexOf(":");
  if (split === -1) return { stage: "whatsapp_click", source: key };
  return { stage: key.slice(0, split), source: key.slice(split + 1) };
}
