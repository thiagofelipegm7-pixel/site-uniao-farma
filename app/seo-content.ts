import type { Unit } from "./site-config";

export type FaqItem = {
  q: string;
  a: string;
};

export const CUSTOMER_QUESTIONS: FaqItem[] = [
  {
    q: "Tem genérico?",
    a: "Sim. Informe o nome do remédio no WhatsApp da loja. A equipe confirma se há genérico, similar ou referência no estoque daquele dia.",
  },
  {
    q: "Aceita receita digital?",
    a: "Sim. Envie a foto da receita ou o link do Memed no WhatsApp. O farmacêutico confere antes de separar o pedido.",
  },
  {
    q: "Entrega no meu bairro?",
    a: "Depende do endereço e da unidade. Toque em Entrega, escolha a loja mais perto e informe o bairro. A taxa e o prazo saem na hora.",
  },
  {
    q: "Preciso de receita para tudo?",
    a: "Não. Só medicamentos de controle e alguns de tarja exigem receita. Na dúvida, pergunte antes de sair de casa.",
  },
  {
    q: "Está aberto agora?",
    a: "A faixa no topo do site mostra Fátima, Nações e Itacolomi em tempo real. Domingo as três fecham até 12:00.",
  },
];

export const HOME_FAQS: FaqItem[] = [
  ...CUSTOMER_QUESTIONS,
  {
    q: "Como consulto o preço de um produto?",
    a: "Toque em Produto, escolha a unidade e mande o nome no WhatsApp. A equipe confirma preço e estoque na hora.",
  },
  {
    q: "Aceitam Pix, cartão e ECX Card?",
    a: "Sim. Pix, dinheiro, débito e crédito. ECX Card é aceito na loja; confirme o desconto com a unidade.",
  },
];

export function getUnitFaqs(unit: Unit): FaqItem[] {
  return [
    {
      q: `Qual é o endereço da farmácia ${unit.shortName} em Sabará?`,
      a: `A unidade fica em ${unit.address}. Consulte a rota no Google Maps antes de sair.`,
    },
    {
      q: `A unidade ${unit.shortName} tem genérico?`,
      a: "Sim. Envie o nome do medicamento no WhatsApp desta loja para confirmar o estoque do dia.",
    },
    {
      q: `A unidade ${unit.shortName} aceita receita digital?`,
      a: "Sim. Envie a foto da receita ou o Memed no WhatsApp desta unidade.",
    },
    {
      q: `A unidade ${unit.shortName} entrega no meu bairro?`,
      a: `A loja fica em ${unit.neighborhood}. Informe o endereço no WhatsApp para confirmar área, taxa e prazo.`,
    },
    {
      q: `Qual é o horário da farmácia ${unit.shortName}?`,
      a: "Segunda a sexta, das 07:00 às 21:00; sábado, das " +
        `${unit.schedule.sat?.open} às ${unit.schedule.sat?.close}; domingo, das 07:00 às 12:00. Feriado: confirme no WhatsApp.`,
    },
  ];
}
