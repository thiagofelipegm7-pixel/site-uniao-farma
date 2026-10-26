import type { FaqItem } from "./seo-content";
import type { Unit } from "./site-config";

export type StoreExtraContent = {
  intro: string;
  bairros: string[];
  bairrosNote: string;
  faqs: FaqItem[];
};


export function getStoreContent(unit: Unit): StoreExtraContent {
  const sunday = unit.schedule.sun;
  const sundayText = sunday ? `Sim. Aos domingos a loja abre das ${sunday.open} às ${sunday.close}.` : "Não. A loja não abre aos domingos.";
  const base: FaqItem[] = [
    { q: `A loja de ${unit.shortName} abre domingo?`, a: sundayText },
    {
      q: "Faz entrega?",
      a: `Sim. A loja entrega em: ${unit.deliveryAreas.join(" e ")}. Peça pelo WhatsApp ${unit.whatsapp}, dentro do horário da loja.`,
    },
    { q: "Qual é o WhatsApp da loja?", a: `O WhatsApp da loja de ${unit.shortName} é ${unit.whatsapp}. O telefone fixo é ${unit.phone}.` },
    { q: "Onde fica a loja?", a: `${unit.street}, bairro ${unit.neighborhood}, Sabará/MG, CEP ${unit.cep}.` },
  ];

  if (unit.amenities?.freeParking) {
    base.push({ q: "Tem estacionamento?", a: `Sim, a loja ${unit.shortName} tem estacionamento gratuito.` });
  }

  if (unit.id === "fatima") {
    return {
      intro:
        "A União Farma de Fátima fica na Rua Cláudio, no bairro Nossa Senhora de Fátima. É a loja que abre mais cedo: de segunda a sábado, a porta abre às 7h. Aqui você encontra medicamentos, itens de higiene, cuidados com a pele e perfumaria. Para ganhar tempo, você pode mandar a lista de produtos pelo WhatsApp antes de sair de casa.",
      bairros: unit.deliveryAreas,
      bairrosNote: "Mora em outro bairro? Chame a loja no WhatsApp para perguntar.",
      faqs: base,
    };
  }
  if (unit.id === "nacoes") {
    return {
      intro:
        "A União Farma de Nações Unidas fica na Rua Inglaterra, no bairro Nações Unidas. A loja abre às 8h e fica aberta até 21h de segunda a sábado. Aqui você encontra medicamentos, itens de higiene, cuidados com a pele e perfumaria. Você pode pedir pelo WhatsApp e receber em casa, ou passar na loja para retirar.",
      bairros: unit.deliveryAreas,
      bairrosNote: "Mora em outro bairro? Chame a loja no WhatsApp para perguntar.",
      faqs: base,
    };
  }
  return {
    intro:
      "A União Farma do Itacolomi fica na Av. Joaquim Ferreira Madureira, no bairro Itacolomi. A loja abre às 8h de segunda a sábado e também abre no domingo de manhã. Aqui você encontra medicamentos, itens de higiene, cuidados com a pele e perfumaria. Você pode pedir pelo WhatsApp e receber em casa.",
    bairros: unit.deliveryAreas,
    bairrosNote: "Mora em outro bairro? Chame a loja no WhatsApp para perguntar.",
    faqs: base,
  };
}
