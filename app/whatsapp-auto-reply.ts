import { getPublicOffers } from "./offers";
import { SITE_URL, type Unit } from "./site-config";
import { getUnitOpenStatus } from "./unit-hours";

export type AutoIntent =
  | "hours"
  | "address"
  | "offer"
  | "delivery"
  | "recipe"
  | "greeting"
  | "product"
  | "medical";

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function classifyWhatsAppIntent(text: string): AutoIntent {
  const value = normalize(text);
  if (!value.trim()) return "greeting";
  if (/(dor|febre|remedio para|o que tomar|posso tomar|dose|sintoma|diagnost)/.test(value)) return "medical";
  if (/(receita|memed|receituario|prescri)/.test(value)) return "recipe";
  if (/(entrega|entregam|delivery|taxa|bairro)/.test(value)) return "delivery";
  if (/(oferta|promo|preco|encarte)/.test(value)) return "offer";
  if (/(horario|abre|fecha|aberto|funcion)/.test(value)) return "hours";
  if (/(endereco|onde fica|como chegar|mapa|rua )/.test(value)) return "address";
  if (/^(oi|ola|bom dia|boa tarde|boa noite|e ai)\b/.test(value)) return "greeting";
  return "product";
}

function unitLabel(unit?: Unit) {
  if (!unit) return "União Farma";
  if (unit.id === "fatima") return "Fátima";
  if (unit.id === "nacoes") return "Nações Unidas";
  return "Itacolomi";
}

export function buildTemplateReply(intent: AutoIntent, unit?: Unit) {
  const name = unitLabel(unit);
  const hours = unit ? getUnitOpenStatus(unit).label : "confirme o horário com a loja";
  const address = unit ? unit.shortAddress : "as três lojas em Sabará";
  const offers = getPublicOffers()
    .slice(0, 3)
    .map((offer) => offer.name)
    .join(", ");

  if (intent === "medical") {
    return `Aqui a equipe não indica remédio por mensagem. Fale com o farmacêutico da ${name} ou procure atendimento médico.`;
  }
  if (intent === "recipe") {
    return `Pode mandar a foto da receita ou o Memed. O farmacêutico da ${name} confere e responde se tem.`;
  }
  if (intent === "delivery") {
    return `A ${name} confere se entrega no seu bairro, a taxa e o prazo. Pode mandar o endereço.`;
  }
  if (intent === "offer") {
    return offers
      ? `Ofertas da semana: ${offers}. Confira em ${SITE_URL}/ofertas. A loja confirma se tem hoje.`
      : `Veja as ofertas em ${SITE_URL}/ofertas. A ${name} confirma preço e estoque.`;
  }
  if (intent === "hours") {
    return `${name}: ${hours}.`;
  }
  if (intent === "address") {
    return `${name} fica em ${address}. Rota: ${unit?.map || SITE_URL}`;
  }
  if (intent === "greeting") {
    return `Olá! Aqui é a União Farma ${name}. Pode pedir preço, entrega, oferta ou mandar a receita. O farmacêutico confirma.`;
  }
  return `Recebemos. A ${name} confirma preço e se tem agora. Se quiser, manda o nome do produto ou a foto da receita.`;
}

export async function composeAutoReply(text: string, unit?: Unit) {
  const intent = classifyWhatsAppIntent(text);
  const fallback = buildTemplateReply(intent, unit);
  const key = process.env.XAI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const endpoint = process.env.XAI_API_KEY?.trim()
    ? "https://api.x.ai/v1/chat/completions"
    : process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com/v1/chat/completions";
  const model = process.env.WHATSAPP_AI_MODEL?.trim() || (process.env.XAI_API_KEY?.trim() ? "grok-4-fast" : "gpt-4o-mini");

  if (!key || intent === "medical") return fallback;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "Você atende o WhatsApp da farmácia União Farma em Sabará. Responda em português do Brasil, curto, no máximo 3 frases. Não indique remédio, dose, diagnóstico nem leia receita. Preço e estoque só o farmacêutico confirma. Use os dados fornecidos.",
          },
          {
            role: "user",
            content: `Loja: ${unitLabel(unit)}. Endereço: ${unit?.shortAddress || "Sabará"}. Situação: ${unit ? getUnitOpenStatus(unit).label : "confirmar"}. Intenção: ${intent}. Mensagem do cliente: ${text.slice(0, 400)}`,
          },
        ],
      }),
    });
    if (!response.ok) return fallback;
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || fallback;
  } catch {
    return fallback;
  }
}

export function autoReplyEnabled() {
  const flag = process.env.WHATSAPP_AUTO_REPLY?.trim().toLowerCase();
  if (flag === "off" || flag === "0" || flag === "false") return false;
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim());
}
