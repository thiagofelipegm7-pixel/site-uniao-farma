import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { SiteDirectoryLinks } from "../SiteDirectoryLinks";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso do site da União Farma.",
  alternates: {
    canonical: "/termos",
  },
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <a className="legal-brand" href="/">
          <img
            src="/uniao-farma-logo.webp"
            alt="Logo da União Farma"
            width="64"
            height="64"
          />
          <span>União Farma</span>
        </a>

        <p className="section-kicker">Regras de utilização</p>
        <h1>Termos de Uso</h1>
        <p className="legal-updated">Última atualização: 31 de julho de 2026.</p>

        <section>
          <h2>1. Finalidade do site</h2>
          <p>
            Este é um site institucional da União Farma. Ele apresenta informações sobre as
            unidades, serviços, horários e categorias de produtos, além de facilitar o contato pelo
            WhatsApp.
          </p>
        </section>

        <section>
          <h2>2. Preços, estoque e promoções</h2>
          <p>
            Preços, estoque, promoções, condições de pagamento, entrega e disponibilidade de
            serviços podem variar entre as unidades. A confirmação final é feita diretamente pela
            equipe da loja escolhida.
          </p>
        </section>

        <section>
          <h2>3. Medicamentos e receitas</h2>
          <p>
            A venda e a dispensação de medicamentos seguem as exigências sanitárias aplicáveis. A
            equipe poderá solicitar receita, identificação ou outros documentos quando necessário.
            O envio de uma foto não garante a venda ou a reserva do produto.
          </p>
        </section>

        <section>
          <h2>4. Informações de saúde</h2>
          <p>
            O conteúdo do site não substitui avaliação médica, diagnóstico, prescrição ou orientação
            individual de um profissional de saúde. Não se automedique.
          </p>
        </section>

        <section>
          <h2>5. Atendimento pelo WhatsApp</h2>
          <p>
            Ao clicar em um botão de WhatsApp, você será direcionado para uma plataforma externa. O
            tempo de resposta pode variar conforme o horário, a fila de atendimento e a unidade.
          </p>
        </section>

        <section>
          <h2>6. Horários e feriados</h2>
          <p>
            O indicador “aberto agora” considera o horário regular informado no site. Em feriados,
            situações excepcionais ou alterações operacionais, confirme o funcionamento diretamente
            com a unidade.
          </p>
        </section>

        <section>
          <h2>7. Propriedade intelectual</h2>
          <p>
            Marca, logotipo, textos, elementos gráficos e demais conteúdos pertencem à União Farma
            ou são utilizados mediante autorização. A reprodução comercial não autorizada é
            proibida.
          </p>
        </section>

        <section>
          <h2>8. Links externos</h2>
          <p>
            O site pode direcionar para WhatsApp, Instagram, Google Maps e outros serviços externos.
            Essas plataformas possuem políticas e termos próprios.
          </p>
        </section>

        <section>
          <h2>9. Alterações</h2>
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
    </main>
  );
}
