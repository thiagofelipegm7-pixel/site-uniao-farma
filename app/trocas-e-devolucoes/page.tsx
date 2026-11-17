import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { SiteDirectoryLinks } from "../SiteDirectoryLinks";
import MarcaUniao from "../shop/MarcaUniao";
import { COMPANY } from "../company";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../site-config";

export const metadata: Metadata = {
  title: "Trocas e devoluções",
  description: "Como desistir de uma compra em até 7 dias e como trocar produto avariado, com defeito ou errado na União Farma, em Sabará.",
  alternates: {
    canonical: "/trocas-e-devolucoes",
  },
};

const nacoes = PUBLIC_UNITS.find((unit) => unit.id === "nacoes") ?? PUBLIC_UNITS[0];

/**
 * Política de trocas e devoluções (pedida pelo Google Merchant Center). Só regras do Código de Defesa do Consumidor e da loja;
 * nada de prazo de reembolso inventado. Pontos que dependem da loja estão em texto neutro e listados no PR para a equipe confirmar.
 */
export default function TrocasPage() {
  const whatsapp = buildWhatsAppUrl(nacoes, "Oi, União Farma Nações Unidas! Quero falar sobre troca ou devolução de um pedido.", {
    campaign: "trocas",
    content: "trocas_devolucoes",
  });
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a className="legal-brand" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
          <MarcaUniao claro />
        </a>

        <p className="section-kicker">Seus direitos na compra</p>
        <h1>Trocas e devoluções</h1>
        <p className="legal-updated">Última atualização: 17 de novembro de 2026.</p>

        <section>
          <h2>1. Desistência em até 7 dias (direito de arrependimento)</h2>
          <p>
            Nos pedidos feitos a distância, pelo site ou pelo WhatsApp, você pode desistir da compra em até 7 dias corridos, contados
            do dia em que recebeu o produto, sem precisar explicar o motivo (art. 49 do Código de Defesa do Consumidor). Os valores
            pagos são devolvidos de imediato, com atualização monetária, como manda a lei.
          </p>
          <p>
            Para desistir, avise a loja dentro do prazo pelo WhatsApp ou pelo telefone abaixo, informando o código do pedido. A loja
            combina com você como o produto volta, e o valor é devolvido pelo mesmo meio de pagamento usado na compra. Essa regra não vale para medicamentos (veja o item 4).
          </p>
        </section>

        <section>
          <h2>2. Produto avariado ou com defeito</h2>
          <p>
            Se o produto chegar amassado, vazando, violado, vencido ou com defeito, fale com a loja assim que perceber, de preferência
            com uma foto do produto e da embalagem. Pelo Código de Defesa do Consumidor (art. 26), o prazo para reclamar de defeito
            aparente é de 30 dias para produtos não duráveis, como cosméticos e itens de higiene, e de 90 dias para produtos duráveis.
          </p>
          <p>
            Confirmado o problema, você escolhe entre a troca por outro produto igual, sem custo, ou a devolução do valor pago, conforme
            o art. 18 do Código de Defesa do Consumidor.
          </p>
        </section>

        <section>
          <h2>3. Produto errado</h2>
          <p>
            Se chegar um produto diferente do que você pediu (outro item, outro tamanho, outra cor ou outra quantidade), avise a loja.
            A troca pelo produto certo é feita sem custo para você. Se preferir, o valor é devolvido.
          </p>
        </section>

        <section>
          <h2>4. Medicamentos</h2>
          <p>
            Pelas normas sanitárias, medicamento que já saiu da farmácia não pode voltar para a venda. Por isso, medicamento só tem
            troca ou devolução em caso de defeito de fabricação, avaria na entrega ou erro no pedido (medicamento, dosagem,
            apresentação ou quantidade diferente do que foi pedido). Não há troca de medicamento por desistência.
          </p>
          <p>
            Se tiver dúvida sobre o medicamento, fale com o farmacêutico da loja antes de usar.
          </p>
        </section>

        <section>
          <h2>5. Produto lacrado, sem defeito</h2>
          <p>
            Fora do prazo de desistência, a troca de produto que não é medicamento, lacrado, sem uso e na embalagem original, pode ser
            pedida à loja, que avalia cada caso. Também nas compras feitas no balcão da loja, a troca sem defeito é combinada com a
            equipe. Defeito e erro seguem sempre os itens 2 e 3.
          </p>
        </section>

        <section>
          <h2>6. Como pedir a troca ou a devolução</h2>
          <ul>
            <li>Fale com a loja {nacoes.shortName} pelo WhatsApp {nacoes.whatsapp} ou pelo telefone {nacoes.phone}.</li>
            <li>Informe o código do pedido, o produto e o que aconteceu. Se puder, mande uma foto.</li>
            <li>Guarde o produto com a embalagem e a nota fiscal ou o comprovante da compra.</li>
            <li>Endereço da loja: {nacoes.address}.</li>
          </ul>
          <p>
            O valor é devolvido pelo mesmo meio de pagamento usado na compra: Pix volta por Pix, dinheiro volta em dinheiro e cartão
            volta como estorno no próprio cartão. No estorno em cartão, o crédito aparece na fatura conforme as regras da operadora do
            cartão.
          </p>
        </section>

        <section>
          <h2>7. Quem vende</h2>
          <p>
            {COMPANY.legalName}, CNPJ {COMPANY.cnpj}. Para reclamações, você também pode procurar o Procon da sua cidade.
          </p>
        </section>

        <div className="legal-actions">
          <a className="button button-whatsapp compact-button" href={whatsapp} target="_blank" rel="noreferrer" data-track-event="whatsapp_click" data-track-unit={nacoes.id} data-track-source="trocas">
            Falar com a loja no WhatsApp
          </a>
          <a className="button button-whatsapp compact-button" href="/">
            Voltar ao site
          </a>
          <a className="button button-call compact-button" href="/termos">
            Ler Termos de Uso
          </a>
        </div>

        <nav className="legal-site-map" aria-label="Navegação do site">
          <SiteDirectoryLinks />
        </nav>
      </div>
    </div>
  );
}
