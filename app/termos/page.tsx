import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { SiteDirectoryLinks } from "../SiteDirectoryLinks";
import MarcaUniao from "../shop/MarcaUniao";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso do site da União Farma.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermsPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a className="legal-brand" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
          <MarcaUniao claro />
        </a>

        <p className="section-kicker">Regras de utilização</p>
        <h1>Termos de Uso</h1>
        <p className="legal-updated">Última atualização: 17 de novembro de 2026.</p>

        <section>
          <h2>1. Finalidade do site</h2>
          <p>
            Este é o site da União Farma. Ele apresenta as unidades, os serviços e os horários e
            mostra os produtos da loja Nações Unidas com preço. No site você monta uma cesta, escolhe
            retirar na loja ou receber em casa e envia o pedido pelo WhatsApp da loja. Nada é cobrado
            no site: o pagamento é feito na retirada ou na entrega.
          </p>
        </section>

        <section>
          <h2>2. Preços, estoque e promoções</h2>
          <p>
            Os preços do site são os da loja Nações Unidas. Nos produtos que não são medicamento, vale
            o preço mostrado no site no momento do pedido; a loja confirma pelo WhatsApp a
            disponibilidade em estoque e combina a entrega. Nos medicamentos, preço e estoque são
            confirmados pela equipe da loja no WhatsApp antes de fechar o pedido.
          </p>
          <p>
            Todos os pedidos estão sujeitos à disponibilidade do produto em estoque. Se faltar algum
            item, a loja avisa antes de separar o pedido. Taxa e prazo de entrega são informados pela
            loja conforme o bairro. Promoções valem pelo período informado ou enquanto durar o estoque.
          </p>
        </section>

        <section>
          <h2>3. Medicamentos e receitas</h2>
          <p>
            A venda e a dispensação de medicamentos seguem as exigências sanitárias aplicáveis. A
            equipe poderá solicitar receita, identificação ou outros documentos quando necessário.
            O envio de uma foto não garante a venda ou a reserva do produto. Medicamento sob
            prescrição só sai com a receita, depois da avaliação do farmacêutico.
          </p>
        </section>

        <section>
          <h2>4. Trocas e devoluções</h2>
          <p>
            As regras de desistência em até 7 dias, de troca de produto avariado, com defeito ou
            errado e de medicamentos estão na página{" "}
            <a href="/trocas-e-devolucoes">Trocas e devoluções</a>.
          </p>
        </section>

        <section>
          <h2>5. Informações de saúde</h2>
          <p>
            O conteúdo do site não substitui avaliação médica, diagnóstico, prescrição ou orientação
            individual de um profissional de saúde. Não se automedique.
          </p>
        </section>

        <section>
          <h2>6. Atendimento pelo WhatsApp</h2>
          <p>
            Ao clicar em um botão de WhatsApp, você será direcionado para uma plataforma externa. O
            tempo de resposta pode variar conforme o horário, a fila de atendimento e a unidade.
          </p>
        </section>

        <section>
          <h2>7. Horários e feriados</h2>
          <p>
            O indicador “aberto agora” considera o horário regular informado no site. Em feriados,
            situações excepcionais ou alterações operacionais, confirme o funcionamento diretamente
            com a unidade.
          </p>
        </section>

        <section>
          <h2>8. Propriedade intelectual</h2>
          <p>
            Marca, logotipo, textos, elementos gráficos e demais conteúdos pertencem à União Farma
            ou são utilizados mediante autorização. A reprodução comercial não autorizada é
            proibida.
          </p>
        </section>

        <section>
          <h2>9. Links externos</h2>
          <p>
            O site pode direcionar para WhatsApp, Instagram, Google Maps e outros serviços externos.
            Essas plataformas possuem políticas e termos próprios.
          </p>
        </section>

        <section>
          <h2>10. Alterações</h2>
          <p>
            Estes termos podem ser atualizados sempre que houver mudanças no site, nos serviços ou
            nas regras aplicáveis.
          </p>
        </section>

        <div className="legal-actions">
          <a className="button button-whatsapp compact-button" href="/ofertas">
            Ver ofertas
          </a>
          <a className="button button-whatsapp compact-button" href="/">
            Voltar ao site
          </a>
          <a className="button button-call compact-button" href="/privacidade">
            Ler Política de Privacidade
          </a>
        </div>

        <nav className="legal-site-map" aria-label="Navegação do site">
          <SiteDirectoryLinks />
        </nav>
      </div>
    </div>
  );
}
