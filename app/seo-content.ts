import type { Unit } from "./site-config";

export type FaqItem = {
  q: string;
  a: string;
};

export const CUSTOMER_QUESTIONS: FaqItem[] = [
  {
    q: "Como peço pelo WhatsApp?",
    a: "Toque na loja do seu bairro no topo do site. A conversa abre pronta. Mande o nome do produto, a dosagem e o bairro. A equipe responde no horário da loja, conforme a fila do atendimento.",
  },
  {
    q: "Qual loja eu escolho?",
    a: "A mais perto de você: Fátima (Rua Cláudio, 902), Nações Unidas (Rua Inglaterra, 162) ou Itacolomi (Rua Joaquim F. Moreira, 489). Estoque e entrega são da loja que você chamar.",
  },
  {
    q: "Vocês entregam no meu bairro?",
    a: "Muitas vezes sim, mas área, taxa e prazo mudam por loja e por endereço. Mande o bairro no WhatsApp da unidade mais perto. Só confirme o pedido depois dessa resposta.",
  },
  {
    q: "Tem o remédio e o preço no site?",
    a: "Não. Não tem carrinho virtual. Preço e estoque valem para o dia e são confirmados na loja, pelo WhatsApp.",
  },
  {
    q: "Aceita receita digital ou foto?",
    a: "Sim. Envie foto nítida da receita ou o link do Memed no WhatsApp da unidade. O farmacêutico confere no horário da loja, antes de separar.",
  },
];

export const HOME_FAQS: FaqItem[] = [
  ...CUSTOMER_QUESTIONS,
  {
    q: "Controlado e antibiótico saem na entrega?",
    a: "Em regra, não. Controlado e antibiótico pedem receita e retirada na loja, com o farmacêutico. Tire a dúvida no WhatsApp antes de ir.",
  },
  {
    q: "Tem genérico mais barato?",
    a: "Na maioria das vezes, sim. Mande o nome e a dosagem. A loja diz se tem genérico, similar ou referência — e o preço de cada um hoje.",
  },
  {
    q: "Qual o horário das lojas?",
    a: "Segunda a sexta, das 7h às 21h. Sábado: Fátima e Itacolomi até 20h, Nações Unidas até 21h. Domingo, as três abrem das 7h ao meio-dia. Em feriado nacional o site não marca “aberto agora” — confirme o horário no WhatsApp da loja.",
  },
  {
    q: "Quais formas de pagamento?",
    a: "Pix, dinheiro, débito e crédito. ECX Card vale na loja. Na entrega, confirme o pagamento com a unidade no WhatsApp.",
  },
];

export function getUnitFaqs(unit: Unit): FaqItem[] {
  return [
    {
      q: `Onde fica a farmácia ${unit.shortName}?`,
      a: `Em ${unit.address}. Se for de carro ou a pé, abra a rota no Google Maps pelo site.`,
    },
    {
      q: `A unidade ${unit.shortName} tem genérico?`,
      a: "Mande o nome do medicamento no WhatsApp desta loja. O estoque muda no dia — a resposta vale para hoje.",
    },
    {
      q: `A unidade ${unit.shortName} aceita receita digital?`,
      a: "Sim. Foto da receita ou Memed no WhatsApp desta unidade. O farmacêutico confere no horário da loja, antes de separar.",
    },
    {
      q: `A unidade ${unit.shortName} entrega no meu bairro?`,
      a: `A loja fica em ${unit.neighborhood}. Mande o endereço no WhatsApp para saber se atende, a taxa e o prazo.`,
    },
    {
      q: `Qual o horário da farmácia ${unit.shortName}?`,
      a: "Segunda a sexta, das 07:00 às 21:00; sábado, das " +
        `${unit.schedule.sat?.open} às ${unit.schedule.sat?.close}; domingo, das 07:00 às 12:00. Em feriado, o site não assume o horário da semana. Confirme no WhatsApp.`,
    },
  ];
}
