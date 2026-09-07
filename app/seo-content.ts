import type { Unit } from "./site-config";

export type FaqItem = {
  q: string;
  a: string;
};

export const CUSTOMER_QUESTIONS: FaqItem[] = [
  {
    q: "Como pe\u00e7o pelo WhatsApp?",
    a: "Toque na loja do seu bairro no topo do site. A conversa abre pronta. Mande o nome do produto, a dosagem e o bairro. A equipe responde no hor\u00e1rio da loja, conforme a fila do atendimento.",
  },
  {
    q: "Qual loja eu escolho?",
    a: "A mais perto de voc\u00ea: F\u00e1tima (Rua Cl\u00e1udio, 902), Na\u00e7\u00f5es Unidas (Rua Inglaterra, 162) ou Itacolomi (Rua Joaquim F. Moreira, 489). Estoque e entrega s\u00e3o da loja que voc\u00ea chamar.",
  },
  {
    q: "Voc\u00eas entregam no meu bairro?",
    a: "Muitas vezes sim, mas \u00e1rea, taxa e prazo mudam por loja e por endere\u00e7o. Mande o bairro no WhatsApp da unidade mais perto. S\u00f3 confirme o pedido depois dessa resposta.",
  },
  {
    q: "Tem o rem\u00e9dio e o pre\u00e7o no site?",
    a: "N\u00e3o. N\u00e3o tem carrinho virtual. Pre\u00e7o e estoque valem para o dia e s\u00e3o confirmados na loja, pelo WhatsApp.",
  },
  {
    q: "Aceita receita digital ou foto?",
    a: "Sim. Envie foto n\u00edtida da receita ou o link do Memed no WhatsApp da unidade. O farmac\u00eautico confere no hor\u00e1rio da loja, antes de separar.",
  },
];

export const HOME_FAQS: FaqItem[] = [
  ...CUSTOMER_QUESTIONS,
  {
    q: "Controlado e antibi\u00f3tico saem na entrega?",
    a: "Em regra, n\u00e3o. Controlado e antibi\u00f3tico pedem receita e retirada na loja, com o farmac\u00eautico. Tire a d\u00favida no WhatsApp antes de ir.",
  },
  {
    q: "Tem gen\u00e9rico mais barato?",
    a: "Na maioria das vezes, sim. Mande o nome e a dosagem. A loja diz se tem gen\u00e9rico, similar ou refer\u00eancia \u2014 e o pre\u00e7o de cada um hoje.",
  },
  {
    q: "Qual o hor\u00e1rio das lojas?",
    a: "Segunda a sexta, das 7h \u00e0s 21h. S\u00e1bado: F\u00e1tima e Itacolomi at\u00e9 20h, Na\u00e7\u00f5es Unidas at\u00e9 21h. Domingo as tr\u00eas abrem das 7h ao meio-dia. Em feriado nacional o site n\u00e3o marca \u201caberto agora\u201d \u2014 confirme o hor\u00e1rio no WhatsApp da loja.",
  },
  {
    q: "Quais formas de pagamento?",
    a: "Pix, dinheiro, d\u00e9bito e cr\u00e9dito. ECX Card vale na loja. Na entrega, confirme o pagamento com a unidade no WhatsApp.",
  },
];

export function getUnitFaqs(unit: Unit): FaqItem[] {
  return [
    {
      q: `Onde fica a farm\u00e1cia ${unit.shortName}?`,
      a: `Na ${unit.address}. Se for de carro ou a p\u00e9, abre a rota no Google Maps pelo site.`,
    },
    {
      q: `A unidade ${unit.shortName} tem gen\u00e9rico?`,
      a: "Manda o nome do medicamento no WhatsApp desta loja. O estoque muda no dia \u2014 a resposta vale para hoje.",
    },
    {
      q: `A unidade ${unit.shortName} aceita receita digital?`,
      a: "Sim. Foto da receita ou Memed no WhatsApp desta unidade. O farmac\u00eautico confere no hor\u00e1rio da loja, antes de separar.",
    },
    {
      q: `A unidade ${unit.shortName} entrega no meu bairro?`,
      a: `A loja fica em ${unit.neighborhood}. Manda o endere\u00e7o no WhatsApp para saber se atende, a taxa e o prazo.`,
    },
    {
      q: `Qual o hor\u00e1rio da farm\u00e1cia ${unit.shortName}?`,
      a: "Segunda a sexta, das 07:00 \u00e0s 21:00; s\u00e1bado, das " +
        `${unit.schedule.sat?.open} \u00e0s ${unit.schedule.sat?.close}; domingo, das 07:00 \u00e0s 12:00. Feriado: o site n\u00e3o assume o hor\u00e1rio da semana. Confirma no WhatsApp.`,
    },
  ];
}
