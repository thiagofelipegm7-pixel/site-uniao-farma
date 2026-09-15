import { UNITS } from "./site-config";

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

export type LegalUnit = {
  label: string;
  street: string;
  neighborhood: string;
  cep: string;
  whatsapp: string;
  hours: string;
};

export const UNIT_LEGAL = Object.fromEntries(
  UNITS.map((unit) => [
    unit.id,
    {
      label: unit.legalLabel,
      street: unit.street,
      neighborhood: unit.legalNeighborhood,
      cep: unit.cep,
      whatsapp: unit.whatsapp,
      hours: unit.hoursSummary,
    },
  ]),
) as Record<"fatima" | "nacoes" | "itacolomi", LegalUnit>;
