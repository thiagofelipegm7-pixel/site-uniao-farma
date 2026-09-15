export const COMPANY = {
  legalName: "Drogaria e Perfumaria União Farma Ltda",
  cnpj: "28.455.556/0001-91",
  city: "Sabará",
  state: "MG",
  pharmacistNote:
    "Farmacêutico responsável presente no horário de funcionamento. Nome, CRF, AFE e alvará de cada unidade ficam no balcão até a conferência para o site.",
  regulators: {
    crfmg: {
      name: "CRF/MG — Conselho Regional de Farmácia de Minas Gerais",
      phone: "(31) 3218-1000",
      url: "https://www.crfmg.org.br",
    },
    vigilancia: {
      name: "Vigilância Sanitária Municipal de Sabará/MG",
      phone: "(31) 3672-7680",
    },
  },
  anvisaWarnings: [
    "As informações deste site têm caráter informativo e não devem ser usadas para automedicação. Não substituem orientação médica ou de outro profissional de saúde.",
    "Medicamento sob prescrição só sai com receita e após avaliação do farmacêutico. Controlado e antibiótico pedem retenção de receita na loja.",
    "Preço, promoção e pagamento valem para a confirmação do dia, no WhatsApp da loja, sujeitos ao estoque da unidade.",
    "SE PERSISTIREM OS SINTOMAS, O MÉDICO DEVERÁ SER CONSULTADO. MEDICAMENTOS PODEM CAUSAR EFEITOS INDESEJADOS. EVITE A AUTOMEDICAÇÃO: INFORME-SE COM O FARMACÊUTICO.",
  ],
};

export const UNIT_LEGAL = {
  fatima: {
    label: "Fátima",
    street: "Rua Cláudio, 902",
    neighborhood: "Bairro Fátima",
    cep: "34515-380",
    whatsapp: "(31) 98738-1786",
    hours: "Segunda a sexta 07:00–21:00 · sábado 07:00–20:00 · domingo 07:00–12:00",
  },
  nacoes: {
    label: "Nações Unidas",
    street: "Rua Inglaterra, 162",
    neighborhood: "Bairro Nações Unidas",
    cep: "34505-800",
    whatsapp: "(31) 98762-9909",
    hours: "Segunda a sexta 07:00–21:00 · sábado 07:00–21:00 · domingo 07:00–12:00",
  },
  itacolomi: {
    label: "Itacolomi",
    street: "Rua Joaquim F. Moreira, 489",
    neighborhood: "Bairro Itacolomi",
    cep: "34518-200",
    whatsapp: "(31) 99493-6960",
    hours: "Segunda a sexta 07:00–21:00 · sábado 07:00–20:00 · domingo 07:00–12:00",
  },
} as const;
