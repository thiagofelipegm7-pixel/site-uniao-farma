import type { FaqItem } from "./seo-content";
import { getHoursSentence, type Unit } from "./site-config";

export type StoreExtraContent = {
  intro: string;
  bairros: string[];
  bairrosNote: string;
  faqs: FaqItem[];
};


const OTHER_BAIRROS = "Fora desses bairros a loja não faz entrega. Para outros endereços, fale com a loja no WhatsApp e retire o pedido no balcão.";

export function getStoreContent(unit: Unit): StoreExtraContent {
  const sunday = unit.schedule.sun;
  const sundayText = sunday ? `Sim. Aos domingos a loja abre das ${sunday.open} às ${sunday.close}.` : "Não. A loja não abre aos domingos.";
  const base: FaqItem[] = [
    { q: `A loja de ${unit.shortName} abre domingo?`, a: sundayText },
    {
      q: "Faz entrega?",
      a: `Sim. A loja ${unit.legalLabel} entrega ${unit.deliveryScope}. Peça pelo WhatsApp ${unit.whatsapp}, dentro do horário da loja. Taxa e prazo são confirmados no WhatsApp.`,
    },
    { q: `Qual é o horário da loja de ${unit.shortName}?`, a: `${getHoursSentence(unit)} Em feriado, confirme no WhatsApp.` },
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
      bairrosNote: OTHER_BAIRROS,
      faqs: base,
    };
  }
  if (unit.id === "nacoes") {
    return {
      intro:
        "A União Farma de Nações Unidas fica na Rua Inglaterra, no bairro Nações Unidas. A loja abre às 8h e fica aberta até 21h de segunda a sábado. Aqui você encontra medicamentos, itens de higiene, cuidados com a pele e perfumaria. Você pode pedir pelo WhatsApp e receber em casa, ou passar na loja para retirar.",
      bairros: unit.deliveryAreas,
      bairrosNote: OTHER_BAIRROS,
      faqs: base,
    };
  }
  base.push({
    q: "A loja do Itacolomi é a Droga Manaus?",
    a: "Sim. A União Farma Itacolomi é a antiga Droga Manaus, nome com que a loja ainda aparece no Google. O endereço é o mesmo: Av. Joaquim Ferreira Madureira, 489, bairro Itacolomi, Sabará/MG.",
  });
  return {
    intro:
      "A União Farma do Itacolomi fica na Av. Joaquim Ferreira Madureira, no bairro Itacolomi. A loja abre às 8h de segunda a sábado e também abre no domingo de manhã. Aqui você encontra medicamentos, itens de higiene, cuidados com a pele e perfumaria. Você pode pedir pelo WhatsApp e receber em casa.",
    bairros: unit.deliveryAreas,
    bairrosNote: OTHER_BAIRROS,
    faqs: base,
  };
}
