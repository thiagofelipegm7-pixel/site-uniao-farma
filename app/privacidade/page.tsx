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
        <a className="legal-brand" href="/" aria-label="União Farma, Drogaria e Perfumaria: página inicial">
          <MarcaUniao claro />
        </a>

        <p className="section-kicker">Privacidade e transparência</p>
        <h1>Política de Privacidade</h1>
        <p className="legal-updated">Última atualização: 14 de novembro de 2026.</p>

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
              Dados que ficam só no seu aparelho: a cesta, a loja preferida, as buscas recentes, o
              último pedido e, se você preencher, seu nome e endereço de entrega. Eles ficam
              guardados no seu navegador para o próximo pedido vir preenchido e só saem dele dentro
              da mensagem de WhatsApp que você mesmo envia. Para apagar, limpe os dados do site no
              navegador.
            </li>
            <li>
              A foto da receita, o texto de uma busca ou a sua fala, quando você usa os recursos
              descritos no item 5.
            </li>
            <li>
              Registros técnicos sem identificação: se o site der erro no seu aparelho, guardamos a
              mensagem do erro, a página e o tipo de navegador; e contamos, por dia, quantas vezes
              cada etapa da cesta foi usada. Sem cookie, sem IP e sem dado pessoal.
            </li>
          </ul>
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
          <h2>5. Leitura de receita, busca e voz</h2>
          <p>
            Alguns recursos do site usam serviços de inteligência artificial de terceiros. Eles só
            funcionam quando você decide usá-los:
          </p>
          <ul>
            <li>
              <strong>Leitura de receita por foto.</strong> A foto que você envia passa pelo nosso
              servidor e é repassada a um serviço de inteligência artificial (Google Gemini ou, como
              reserva, Cloudflare Workers AI) apenas para ler os nomes e as doses dos medicamentos.
              Nós não gravamos a foto. A receita traz dados de saúde e pode trazer o seu nome e o do
              médico: use este recurso só se concordar com esse envio. Você sempre pode mostrar a
              receita diretamente ao farmacêutico, na loja ou pelo WhatsApp. Para evitar abuso,
              guardamos por alguns minutos um contador ligado a um código derivado do seu endereço
              de internet (IP), sem a foto.
            </li>
            <li>
              <strong>Busca de produtos.</strong> Quando a busca não encontra o que foi digitado, o
              texto pode ser enviado a esses mesmos serviços para corrigir a digitação. Vai só o
              texto, sem identificar quem buscou.
            </li>
            <li>
              <strong>Busca por voz.</strong> A fala é transformada em texto pelo reconhecimento de
              voz do seu próprio navegador (por exemplo, do Google no Chrome ou da Apple no Safari),
              conforme as regras desse fornecedor. O site recebe apenas o texto.
            </li>
          </ul>
          <p>
            A inteligência artificial do site não indica medicamentos. O farmacêutico confere a
            receita e o pedido antes de qualquer venda.
          </p>
        </section>

        <section>
          <h2>6. Compartilhamento</h2>
          <p>
            Os dados podem ser tratados por fornecedores necessários ao funcionamento do site e do
            atendimento: Cloudflare (hospedagem e banco de dados), Google (Analytics, quando
            autorizado, e inteligência artificial), Meta (Pixel, quando autorizado) e WhatsApp,
            respeitando as finalidades informadas e as configurações escolhidas pelo usuário.
          </p>
        </section>

        <section>
          <h2>7. Seus direitos</h2>
          <p>
            Você pode solicitar informações, correção, atualização, exclusão ou esclarecimentos
            sobre o tratamento de seus dados, observadas as obrigações legais aplicáveis. Entre em
            contato pelos canais das unidades para registrar a solicitação.
          </p>
        </section>

        <section>
          <h2>8. Segurança e retenção</h2>
          <p>
            São adotadas medidas razoáveis para proteger os dados e limitar o tratamento ao período
            necessário para atendimento, cumprimento de obrigações e defesa de direitos.
          </p>
        </section>

        <section>
          <h2>9. Alterações nesta política</h2>
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
