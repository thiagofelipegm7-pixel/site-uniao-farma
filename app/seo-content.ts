import type { Unit } from "./site-config";

export type FaqItem = {
  q: string;
  a: string;
};

export const HOME_FAQS: FaqItem[] = [
  {
    q: "Como consulto o preço de um produto?",
    a: "Clique em um botão de consulta e escolha a unidade. Consulte a equipe sobre disponibilidade e requisitos de atendimento. Produtos sujeitos a prescrição seguem os requisitos aplicáveis.",
  },
  {
    q: "Vocês fazem entrega em toda Sabará?",
    a: "Cada unidade atende uma área específica. A disponibilidade, a taxa e o prazo são confirmados pelo WhatsApp da unidade escolhida.",
  },
  {
    q: "Preciso de receita para todos os medicamentos?",
    a: "Não. A necessidade de receita depende do medicamento. Antibióticos, medicamentos controlados e outros produtos sujeitos a prescrição exigem a documentação correspondente.",
  },
  {
    q: "Vocês aplicam injetáveis?",
    a: "A aplicação é oferecida mediante confirmação prévia da unidade, presença do profissional e apresentação da receita quando exigida. Consulte o horário antes de se deslocar.",
  },
  {
    q: "Vocês fazem aferição de pressão e teste de glicemia?",
    a: "Sim. Consulte pelo WhatsApp a disponibilidade, o horário e as orientações do serviço na unidade escolhida antes de se deslocar.",
  },
  {
    q: "Aceitam o convênio ECX Card?",
    a: "Sim. Apresente o cartão na loja e confirme com a unidade os produtos e as condições de desconto disponíveis.",
  },
  {
    q: "Quais formas de pagamento são aceitas?",
    a: "As unidades aceitam Pix, dinheiro, débito e crédito. As condições de parcelamento podem variar e devem ser confirmadas diretamente com a loja.",
  },
];

export function getUnitFaqs(unit: Unit): FaqItem[] {
  return [
    {
      q: `Qual é o endereço da farmácia ${unit.shortName} em Sabará?`,
      a: `A unidade fica em ${unit.address}. Consulte a rota no Google Maps antes de sair.`,
    },
    {
      q: `Qual é o telefone e o WhatsApp da unidade ${unit.shortName}?`,
      a: `O telefone é ${unit.phone} e o WhatsApp é ${unit.whatsapp}. Use o botão de atendimento desta página para falar diretamente com a equipe.`,
    },
    {
      q: `Qual é o horário da farmácia ${unit.shortName}?`,
      a: "O horário regular é de segunda a sexta, das 07:00 às 21:00; aos sábados, das " +
        `${unit.schedule.sat?.open} às ${unit.schedule.sat?.close}; e aos domingos, das 07:00 às 12:00. Em feriados, confirme pelo WhatsApp.`,
    },
    {
      q: `Quais bairros a unidade ${unit.shortName} atende com entrega?`,
      a: `A unidade fica no bairro ${unit.neighborhood}. A lista de bairros atendidos, a taxa e o prazo de entrega dependem do endereço informado e devem ser confirmados diretamente pelo WhatsApp.`,
    },
  ];
}
