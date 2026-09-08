import { getPublicOffers } from "./offers";
import { SITE_URL, UNITS, type Unit } from "./site-config";
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
  if (!unit) return "Uniao Farma";
  if (unit.id === "fatima") return "Fatima";
  if (unit.id === "nacoes") return "Nacoes Unidas";
  return "Itacolomi";
}

export function buildTemplateReply(intent: AutoIntent, unit?: Unit) {
  const name = unitLabel(unit);
  const hours = unit ? getUnitOpenStatus(unit).label : "confirme o horario com a loja";
  const address = unit ? unit.shortAddress : "as tres lojas em Sabara";
  const offers = getPublicOffers()
    .slice(0, 3)
    .map((offer) => offer.name)
    .join(", ");

  if (intent === "medical") {
    return `Aqui a equipe nao indica remedio por mensagem. Fale com o farmaceutico da ${name} ou procure atendimento medico.`;
  }
  if (intent === "recipe") {
    return `Pode mandar a foto da receita ou o Memed. O farmaceutico da ${name} confere e responde se tem.`;
  }
  if (intent === "delivery") {
    return `A ${name} confere se entrega no seu bairro, a taxa e o prazo. Pode mandar o endereco.`;
  }
  if (intent === "offer") {
    return offers
      ? `Ofertas da semana: ${offers}. Confira em ${SITE_URL}/ofertas. A loja confirma se tem hoje.`
      : `Veja as ofertas em ${SITE_URL}/ofertas. A ${name} confirma preco e estoque.`;
  }
  if (intent === "hours") {
    return `${name}: ${hours}.`;
  }
  if (intent === "address") {
    return `${name} fica em ${address}. Rota: ${unit?.map || SITE_URL}`;
  }
  if (intent === "greeting") {
    return `Ola! Aqui e a Uniao Farma ${name}. Pode pedir preco, entrega, oferta ou mandar a receita. O farmaceutico confirma.`;
  }
  return `Recebemos. A ${name} confirma preco e se tem agora. Se quiser, manda o nome do produto ou a foto da receita.`;
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
              "Voce atende o WhatsApp da farmacia Uniao Farma em Sabara. Responda em portugues curto, no maximo 3 frases. Nao indique remedio, dose, diagnostico nem leia receita. Preco e estoque so o farmaceutico confirma. Use os dados fornecidos.",
          },
          {
            role: "user",
            content: `Loja: ${unitLabel(unit)}. Endereco: ${unit?.shortAddress || "Sabara"}. Situacao: ${unit ? getUnitOpenStatus(unit).label : "confirmar"}. Intencao: ${intent}. Mensagem do cliente: ${text.slice(0, 400)}`,
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
