import type { Metadata } from "next";
/* eslint-disable @next/next/no-html-link-for-pages -- Native links avoid the Vinext client-navigation failure. */
import { SiteDirectoryLinks } from "../SiteDirectoryLinks";
import MarcaUniao from "../shop/MarcaUniao";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de Privacidade e uso de cookies do site da União Farma.",
  alternates: {
    canonical: "/privacidade",
  },
};

export default function PrivacyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <a className="legal-brand" href="/" aria-label="União Farma Drogaria e Perfumaria: página inicial">
          <MarcaUniao claro />
        </a>

        <p className="section-kicker">Privacidade e transparência</p>
        <h1>Política de Privacidade</h1>
        <p className="legal-updated">Última atualização: 18 de novembro de 2026.</p>

        <section>
          <h2>1. Quem é responsável pelo site</h2>
          <p>
            O site é mantido pela União Farma, Drogaria e Perfumaria com unidades em Sabará/MG. Para
            assuntos relacionados à privacidade, você pode entrar em contato pelos telefones e
            WhatsApps informados na página de unidades.
          </p>
        </section>

        <section>
          <h2>2. Quais dados podem ser tratados</h2>
          <p>O site pode tratar as seguintes categorias de dados:</p>
          <ul>
            <li>Dados técnicos de navegação, quando você aceita cookies opcionais.</li>
            <li>Informações fornecidas voluntariamente ao iniciar uma conversa pelo WhatsApp.</li>
            <li>Dados necessários para responder consultas, pedidos e solicitações de atendimento.</li>
            <li>
              Buscas feitas no site, de forma anônima: guardamos só o texto da busca, o dia e uma contagem, sem IP, cookie ou qualquer
              identificação de quem buscou, e apagamos depois de 90 dias. O mesmo vale para a contagem de qual produto foi aberto depois de
              uma busca, que ajuda a mostrar primeiro o que as pessoas mais procuram. Termos de saúde sensível, números longos e e-mails são descartados.
            </li>
            <li>
              Lembrete de recompra, só se você marcar a caixa &quot;Quero receber lembrete pelo WhatsApp quando estiver na hora de repor meus
              produtos&quot; ao fechar a cesta (ela vem desmarcada): guardamos seu nome, seu celular, os produtos da cesta, o texto que você
              aceitou e a data. Uns 30 dias depois, alguém da equipe pode mandar uma mensagem pelo WhatsApp lembrando de produtos de uso
              contínuo que não são medicamento (fralda, higiene, dermocosmético, perfumaria, suplemento). Medicamento nunca entra no lembrete.
              Nada é enviado automaticamente. Para parar, responda SAIR: apagamos seu nome e celular e não mandamos mais. Esses dados são
              apagados em até 90 dias.
            </li>
          </ul>
          <p>
            A busca por voz, quando você toca no microfone, usa o reconhecimento de fala do seu navegador: o áudio é tratado pelo serviço do
            próprio navegador, sob as regras dele. Este site recebe apenas o texto da busca e não guarda nem envia áudio.
          </p>
          <p>
            O conteúdo das mensagens enviadas pelo WhatsApp não é armazenado diretamente por este
            site. O tratamento também está sujeito às regras da plataforma WhatsApp/Meta.
          </p>
        </section>

        <section>
          <h2>3. Finalidades</h2>
          <ul>
            <li>Direcionar você para a unidade escolhida.</li>
            <li>Responder consultas sobre preço, estoque, entrega e serviços.</li>
            <li>Lembrar você de repor produtos que não são medicamento, só quando você pede (consentimento, que pode ser retirado a qualquer momento respondendo SAIR).</li>
            <li>Medir o desempenho do site e das campanhas, quando houver consentimento.</li>
            <li>Melhorar a navegação e a experiência de atendimento. Quando uma busca no site não encontra produto, guardamos só o texto da busca (sem acento), o dia e uma contagem, de forma anônima: sem IP, sem cookie e sem identificar quem digitou, e sem termos de saúde sensível. Usamos para saber quais produtos e palavras faltam, e apagamos depois de 90 dias.</li>
          </ul>
        </section>

        <section>
          <h2>4. Cookies e ferramentas de análise</h2>
          <p>
            Google Analytics e Meta Pixel são opcionais e somente são carregados após sua
            autorização no banner de cookies. Você pode rejeitar esses cookies e continuar usando o
            site normalmente.
          </p>
          <p>
            A preferência fica salva no seu navegador. O botão “Cookies”, exibido no canto da tela,
            permite reabrir as opções.
          </p>
        </section>

        <section>
          <h2>5. Compartilhamento</h2>
          <p>
            Os dados podem ser tratados por fornecedores necessários ao funcionamento do site e do
            atendimento, como hospedagem, Google, Meta e WhatsApp, respeitando as finalidades
            informadas e as configurações escolhidas pelo usuário.
          </p>
        </section>

        <section>
          <h2>6. Seus direitos</h2>
          <p>
            Você pode solicitar informações, correção, atualização, exclusão ou esclarecimentos
            sobre o tratamento de seus dados, observadas as obrigações legais aplicáveis. Entre em
            contato pelos canais das unidades para registrar a solicitação.
          </p>
        </section>

        <section>
          <h2>7. Segurança e retenção</h2>
          <p>
            São adotadas medidas razoáveis para proteger os dados e limitar o tratamento ao período
            necessário para atendimento, cumprimento de obrigações e defesa de direitos.
          </p>
        </section>

        <section>
          <h2>8. Alterações nesta política</h2>
          <p>
            Esta política pode ser atualizada para refletir mudanças no site, nos serviços ou nas
            regras aplicáveis. A data da versão mais recente será informada no início da página.
          </p>
        </section>

        <div className="legal-actions">
          <a className="button button-whatsapp compact-button" href="/ofertas">
            Ver ofertas
          </a>
          <a className="button button-whatsapp compact-button" href="/#unidades-rapidas">
            Ver canais de atendimento
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
