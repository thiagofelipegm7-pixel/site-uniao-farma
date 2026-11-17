import { PUBLIC_UNITS, type Unit } from "./site-config";

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
    q: "Onde fica a loja?",
    a: "A loja Nações Unidas (Rua Inglaterra, 162). Estoque e entrega são da loja que você chamar.",
  },
  {
    q: "Vocês entregam no meu bairro?",
    a: `Depende da loja. ${PUBLIC_UNITS.map((unit) => `A loja ${unit.legalLabel} entrega ${unit.deliveryScope}`).join(". ")}. Taxa e prazo são confirmados no WhatsApp da loja antes de fechar o pedido.`,
  },
  {
    q: "Tem preço no site? Posso montar o pedido por aqui?",
    a: "Sim. Os produtos da loja Nações Unidas têm preço no site e você monta a cesta, escolhe retirar ou receber em casa e envia o pedido pelo WhatsApp da loja. Nada é cobrado no site: o pagamento é na retirada ou na entrega.",
  },
  {
    q: "O preço do site vale?",
    a: "Nos produtos que não são medicamento, vale o preço mostrado no site. A loja confirma pelo WhatsApp só o estoque e combina a entrega. Nos medicamentos, a loja confirma preço e estoque pelo WhatsApp, e o que pede receita só sai com a receita, depois da avaliação do farmacêutico.",
  },
  {
    q: "Posso trocar ou devolver?",
    a: "Sim. Nos pedidos feitos pelo site ou pelo WhatsApp, você pode desistir em até 7 dias depois de receber. Produto avariado, com defeito ou errado tem troca. Medicamento só tem troca por defeito ou erro. Veja as regras em Trocas e devoluções.",
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
    q: "Vocês têm medicamento genérico?",
    a: "Consulte com o farmacêutico as opções de genérico disponíveis para a sua receita. Mande o nome e a dosagem pelo WhatsApp e a loja informa o que tem hoje.",
  },
  {
    q: "Qual o horário da loja?",
    a: "A loja Nações Unidas abre às 8h, todos os dias. De segunda a sábado fecha às 21h; domingo, ao meio-dia. Em feriado nacional o site não marca “aberto agora” — confirme o horário no WhatsApp da loja.",
  },
  {
    q: "Quais formas de pagamento?",
    a: "Pix, dinheiro, débito e crédito. ECX Card vale na loja. Na entrega, confirme o pagamento com a unidade no WhatsApp.",
  },
];

/** FAQ de /receita: só fatos que já estão no site (home, termos e página da receita). */
export const RECIPE_FAQS: FaqItem[] = [
  {
    q: "Posso enviar a receita por foto ou pelo Memed?",
    a: "Sim. Envie foto nítida da receita ou o link do Memed no WhatsApp da loja. O farmacêutico confere no horário da loja, antes de separar.",
  },
  {
    q: "A loja responde se tem o medicamento?",
    a: "Sim. A loja do bairro confere no horário e responde se tem. O estoque muda no dia, então a resposta vale para hoje.",
  },
  {
    q: "Enviar a foto da receita garante a venda ou a reserva?",
    a: "Não. O envio de uma foto não garante a venda ou a reserva do produto. A equipe pode pedir receita, identificação ou outros documentos quando necessário.",
  },
  {
    q: "Controlado e antibiótico saem na entrega?",
    a: "Em regra, não. Controlado e antibiótico pedem retirada na loja, com retenção da receita e o farmacêutico. Tire a dúvida no WhatsApp antes de ir.",
  },
  {
    q: "Para onde envio a receita?",
    a: "A loja Nações Unidas (Rua Inglaterra, 162). Estoque e entrega são da loja que você chamar.",
  },
  {
    q: "Que dados devo enviar junto com a receita?",
    a: "Envie só os dados necessários. Não mande informações além das que a receita já traz.",
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
      a: `A loja ${unit.legalLabel} entrega ${unit.deliveryScope}. Taxa e prazo são confirmados no WhatsApp da loja.`,
    },
    {
      q: `Qual o horário da farmácia ${unit.shortName}?`,
      a: `Segunda a sexta, das ${unit.schedule.mon?.open} às ${unit.schedule.mon?.close}; sábado, das ` +
        `${unit.schedule.sat?.open} às ${unit.schedule.sat?.close}; domingo, das ${unit.schedule.sun?.open} às ${unit.schedule.sun?.close}. Em feriado, o site não assume o horário da semana. Confirme no WhatsApp.`,
    },
  ];
}
