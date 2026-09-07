import type { Unit } from "./site-config";

export type FaqItem = {
  q: string;
  a: string;
};

export const CUSTOMER_QUESTIONS: FaqItem[] = [
  {
    q: "Tem genérico?",
    a: "Quase sempre. Manda o nome do remédio no WhatsApp da loja. A equipe olha o estoque daquele dia e fala se tem genérico, similar ou referência.",
  },
  {
    q: "Aceita receita digital?",
    a: "Aceita. Envia a foto da receita ou o link do Memed no WhatsApp. O farmacêutico confere antes de separar.",
  },
  {
    q: "Entrega no meu bairro?",
    a: "Depende da loja e do endereço. Escolhe a unidade mais perto, manda o bairro e pergunta taxa e horário. Não prometemos entrega sem essa confirmação.",
  },
  {
    q: "Preciso de receita para tudo?",
    a: "Não. Só controlados e alguns de tarja pedem receita. Se tiver dúvida, pergunta no Zap antes de sair de casa.",
  },
  {
    q: "Está aberto agora?",
    a: "A faixa no topo mostra Fátima, Nações e Itacolomi. No domingo as três fecham às 12h. Feriado é melhor confirmar na loja.",
  },
];

export const HOME_FAQS: FaqItem[] = [
  ...CUSTOMER_QUESTIONS,
  {
    q: "Como consulto o preço?",
    a: "Toque em Produto, escolha a unidade e mande o nome. Quem responde é a loja — com o preço e se tem na prateleira.",
  },
  {
    q: "Aceitam Pix, cartão e ECX Card?",
    a: "Pix, dinheiro, débito e crédito. ECX Card vale na loja; o desconto do cartão a equipe confirma na hora.",
  },
];

export function getUnitFaqs(unit: Unit): FaqItem[] {
  return [
    {
      q: `Onde fica a farmácia ${unit.shortName}?`,
      a: `Na ${unit.address}. Se for de carro ou a pé, abre a rota no Google Maps pelo site.`,
    },
    {
      q: `A unidade ${unit.shortName} tem genérico?`,
      a: "Manda o nome do medicamento no WhatsApp desta loja. O estoque muda no dia — a resposta vale para hoje.",
    },
    {
      q: `A unidade ${unit.shortName} aceita receita digital?`,
      a: "Sim. Foto da receita ou Memed no WhatsApp desta unidade. O farmacêutico confere antes de separar.",
    },
    {
      q: `A unidade ${unit.shortName} entrega no meu bairro?`,
      a: `A loja fica em ${unit.neighborhood}. Manda o endereço no WhatsApp para saber se atende, a taxa e o prazo.`,
    },
    {
      q: `Qual o horário da farmácia ${unit.shortName}?`,
      a: "Segunda a sexta, das 07:00 às 21:00; sábado, das " +
        `${unit.schedule.sat?.open} às ${unit.schedule.sat?.close}; domingo, das 07:00 às 12:00. Feriado: confirma no WhatsApp.`,
    },
  ];
}
