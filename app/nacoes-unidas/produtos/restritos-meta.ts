import type { TipoRestrito } from "./receita";

const TEXTOS: Record<TipoRestrito, { titulo: string; h1: string; intro: string; rota: string; vazio: string; caminho: string }> = {
  receita: {
    titulo: "Medicamentos com receita: lista de preços | União Farma Nações Unidas",
    h1: "Medicamentos com receita: lista de preços",
    intro:
      "Lista de preços informativa dos medicamentos de venda sob prescrição médica da loja Nações Unidas. Pedido pelo WhatsApp, sem pagamento no site: monte a cesta e retire na loja apresentando a receita.",
    rota: "/nacoes-unidas/produtos/receita",
    vazio: "Nenhum medicamento encontrado nesta lista.",
    caminho: "Com receita",
  },
  controlados: {
    titulo: "Medicamentos controlados e antimicrobianos | União Farma Nações Unidas",
    h1: "Medicamentos controlados e antimicrobianos",
    intro:
      "Medicamentos controlados (Portaria SVS/MS 344/98) não são vendidos pelo site e aparecem sem preço: a venda é só na loja, com a Notificação de Receita, e a receita fica retida pela farmácia. Os antimicrobianos (receita retida) seguem com preço e retirada na loja. Converse com o farmacêutico.",
    rota: "/nacoes-unidas/produtos/controlados",
    vazio: "Nenhum medicamento controlado encontrado nesta lista.",
    caminho: "Controlados",
  },
  consulte: {
    titulo: "Consulte o farmacêutico: lista de preços | União Farma Nações Unidas",
    h1: "Consulte o farmacêutico: lista de preços",
    intro:
      "Itens da loja Nações Unidas cujo enquadramento (com ou sem receita) ainda está sendo confirmado. Os preços são informativos. Não há cesta para estes itens: antes de comprar, converse com o farmacêutico na loja ou pelo WhatsApp.",
    rota: "/nacoes-unidas/produtos/consulte-o-farmaceutico",
    vazio: "Nenhum item encontrado nesta lista.",
    caminho: "Consulte o farmacêutico",
  },
};

export function metadadosRestrita(tipo: TipoRestrito) {
  const t = TEXTOS[tipo];
  return {
    title: { absolute: t.titulo },
    description: t.intro,
    alternates: { canonical: t.rota },
    robots: { index: false, follow: false },
  };
}

export { TEXTOS };
