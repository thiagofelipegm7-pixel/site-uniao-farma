import { COMPANY, UNIT_LEGAL } from "../../../company";
import { getPublishedNews, NEWS_VISUALS } from "../../../news-content";
import { CUSTOMER_QUESTIONS } from "../../../seo-content";
import { buildWhatsAppUrl, PUBLIC_UNITS } from "../../../site-config";

export const dynamic = "force-dynamic";

type Bloco = { tipo: "h2" | "subtitulo" | "texto" | "link"; texto: string; url?: string };

/**
 * Textos das páginas informativas no app (texto nativo). Usa os mesmos dados do site (empresa, unidades, perguntas),
 * então um dado alterado no cadastro muda nos dois lugares. Só o texto fixo fica copiado das páginas.
 */
function institucional(): { titulo: string; blocos: Bloco[] } {
  const blocos: Bloco[] = [
    { tipo: "texto", texto: `${COMPANY.legalName}. CNPJ ${COMPANY.cnpj}. Matriz em ${COMPANY.city}/${COMPANY.state}.` },
    { tipo: "texto", texto: COMPANY.pharmacistNote },
    { tipo: "h2", texto: "Unidades" },
  ];
  for (const unidade of Object.values(UNIT_LEGAL)) {
    blocos.push({ tipo: "subtitulo", texto: unidade.label });
    blocos.push({ tipo: "texto", texto: `${unidade.street} — ${unidade.neighborhood}, Sabará/MG — CEP ${unidade.cep}` });
    blocos.push({ tipo: "texto", texto: `WhatsApp: ${unidade.whatsapp}` });
    blocos.push({ tipo: "texto", texto: `Horário: ${unidade.hours}` });
    blocos.push({ tipo: "texto", texto: "Responsável técnico, CRF, AFE e alvará: confira no balcão desta loja." });
  }
  blocos.push({ tipo: "h2", texto: "Orientação farmacêutica" });
  blocos.push({
    tipo: "texto",
    texto: "Dúvida de medicamento, dosagem ou interação: fale com o farmacêutico da loja do seu bairro, no horário de funcionamento.",
  });
  blocos.push({ tipo: "texto", texto: `${COMPANY.regulators.crfmg.name}: ${COMPANY.regulators.crfmg.phone}. crfmg.org.br` });
  blocos.push({ tipo: "texto", texto: `${COMPANY.regulators.vigilancia.name}: ${COMPANY.regulators.vigilancia.phone}.` });
  blocos.push({ tipo: "h2", texto: "Avisos sanitários" });
  for (const aviso of COMPANY.anvisaWarnings) blocos.push({ tipo: "texto", texto: aviso });
  blocos.push({
    tipo: "texto",
    texto: `© ${new Date().getFullYear()} União Farma. Todos os direitos reservados. ${COMPANY.legalName}.`,
  });
  return { titulo: "Dados institucionais", blocos };
}

function perguntas(): { titulo: string; blocos: Bloco[] } {
  const blocos: Bloco[] = [{ tipo: "texto", texto: "Resposta curta. Se precisar confirmar, fale com a loja." }];
  for (const item of CUSTOMER_QUESTIONS) {
    blocos.push({ tipo: "subtitulo", texto: item.q });
    blocos.push({ tipo: "texto", texto: item.a });
  }
  return { titulo: "O que o cliente mais pergunta", blocos };
}

function privacidade(): { titulo: string; blocos: Bloco[] } {
  return {
    titulo: "Política de Privacidade",
    blocos: [
      { tipo: "texto", texto: "Última atualização: 31 de julho de 2026." },
      { tipo: "h2", texto: "1. Quem é responsável pelo site" },
      { tipo: "texto", texto: "O site é mantido pela União Farma, Drogaria e Perfumaria com unidades em Sabará/MG. Para assuntos relacionados à privacidade, você pode entrar em contato pelos telefones e WhatsApps informados na página de unidades." },
      { tipo: "h2", texto: "2. Quais dados podem ser tratados" },
      { tipo: "texto", texto: "O site pode tratar as seguintes categorias de dados:" },
      { tipo: "texto", texto: "• Dados técnicos de navegação, quando você aceita cookies opcionais." },
      { tipo: "texto", texto: "• Informações fornecidas voluntariamente ao iniciar uma conversa pelo WhatsApp." },
      { tipo: "texto", texto: "• Dados necessários para responder consultas, pedidos e solicitações de atendimento." },
      { tipo: "texto", texto: "O conteúdo das mensagens enviadas pelo WhatsApp não é armazenado diretamente por este site. O tratamento também está sujeito às regras da plataforma WhatsApp/Meta." },
      { tipo: "h2", texto: "3. Finalidades" },
      { tipo: "texto", texto: "• Direcionar você para a unidade escolhida." },
      { tipo: "texto", texto: "• Responder consultas sobre preço, estoque, entrega e serviços." },
      { tipo: "texto", texto: "• Medir o desempenho do site e das campanhas, quando houver consentimento." },
      { tipo: "texto", texto: "• Melhorar a navegação e a experiência de atendimento. Quando uma busca no site não encontra produto, guardamos só o texto da busca (sem acento), o dia e uma contagem, de forma anônima: sem IP, sem cookie e sem identificar quem digitou, e sem termos de saúde sensível. Usamos para saber quais produtos e palavras faltam, e apagamos depois de 90 dias." },
      { tipo: "h2", texto: "4. Cookies e ferramentas de análise" },
      { tipo: "texto", texto: "Google Analytics e Meta Pixel são opcionais e somente são carregados após sua autorização no banner de cookies. Você pode rejeitar esses cookies e continuar usando o site normalmente." },
      { tipo: "texto", texto: "A preferência fica salva no seu navegador. O botão “Cookies”, exibido no canto da tela, permite reabrir as opções." },
      { tipo: "h2", texto: "5. Compartilhamento" },
      { tipo: "texto", texto: "Os dados podem ser tratados por fornecedores necessários ao funcionamento do site e do atendimento, como hospedagem, Google, Meta e WhatsApp, respeitando as finalidades informadas e as configurações escolhidas pelo usuário." },
      { tipo: "h2", texto: "6. Seus direitos" },
      { tipo: "texto", texto: "Você pode solicitar informações, correção, atualização, exclusão ou esclarecimentos sobre o tratamento de seus dados, observadas as obrigações legais aplicáveis. Entre em contato pelos canais das unidades para registrar a solicitação." },
      { tipo: "h2", texto: "7. Segurança e retenção" },
      { tipo: "texto", texto: "São adotadas medidas razoáveis para proteger os dados e limitar o tratamento ao período necessário para atendimento, cumprimento de obrigações e defesa de direitos." },
      { tipo: "h2", texto: "8. Alterações nesta política" },
      { tipo: "texto", texto: "Esta política pode ser atualizada para refletir mudanças no site, nos serviços ou nas regras aplicáveis. A data da versão mais recente será informada no início da página." },
    ],
  };
}

function termos(): { titulo: string; blocos: Bloco[] } {
  return {
    titulo: "Termos de Uso",
    blocos: [
      { tipo: "texto", texto: "Última atualização: 31 de julho de 2026." },
      { tipo: "h2", texto: "1. Finalidade do site" },
      { tipo: "texto", texto: "Este é um site institucional da União Farma. Ele apresenta informações sobre as unidades, serviços, horários e categorias de produtos, além de facilitar o contato pelo WhatsApp." },
      { tipo: "h2", texto: "2. Preços, estoque e promoções" },
      { tipo: "texto", texto: "Preços, estoque, promoções, condições de pagamento, entrega e disponibilidade de serviços podem variar entre as unidades. A confirmação final é feita diretamente pela equipe da loja escolhida." },
      { tipo: "h2", texto: "3. Medicamentos e receitas" },
      { tipo: "texto", texto: "A venda e a dispensação de medicamentos seguem as exigências sanitárias aplicáveis. A equipe poderá solicitar receita, identificação ou outros documentos quando necessário. O envio de uma foto não garante a venda ou a reserva do produto." },
      { tipo: "h2", texto: "4. Informações de saúde" },
      { tipo: "texto", texto: "O conteúdo do site não substitui avaliação médica, diagnóstico, prescrição ou orientação individual de um profissional de saúde. Não se automedique." },
      { tipo: "h2", texto: "5. Atendimento pelo WhatsApp" },
      { tipo: "texto", texto: "Ao clicar em um botão de WhatsApp, você será direcionado para uma plataforma externa. O tempo de resposta pode variar conforme o horário, a fila de atendimento e a unidade." },
      { tipo: "h2", texto: "6. Horários e feriados" },
      { tipo: "texto", texto: "O indicador “aberto agora” considera o horário regular informado no site. Em feriados, situações excepcionais ou alterações operacionais, confirme o funcionamento diretamente com a unidade." },
      { tipo: "h2", texto: "7. Propriedade intelectual" },
      { tipo: "texto", texto: "Marca, logotipo, textos, elementos gráficos e demais conteúdos pertencem à União Farma ou são utilizados mediante autorização. A reprodução comercial não autorizada é proibida." },
      { tipo: "h2", texto: "8. Links externos" },
      { tipo: "texto", texto: "O site pode direcionar para WhatsApp, Instagram, Google Maps e outros serviços externos. Essas plataformas possuem políticas e termos próprios." },
      { tipo: "h2", texto: "9. Alterações" },
      { tipo: "texto", texto: "Estes termos podem ser atualizados sempre que houver mudanças no site, nos serviços ou nas regras aplicáveis." },
    ],
  };
}

/** Unidades e WhatsApp (mesma informação da página de unidades e da página de anúncio do site). */
function unidades(): { titulo: string; blocos: Bloco[] } {
  const blocos: Bloco[] = [{ tipo: "texto", texto: "Toque no WhatsApp da loja do seu bairro. A conversa abre com a mensagem pronta." }];
  for (const unidade of PUBLIC_UNITS) {
    blocos.push({ tipo: "subtitulo", texto: unidade.title });
    blocos.push({ tipo: "texto", texto: unidade.address });
    blocos.push({ tipo: "texto", texto: `Horário: ${unidade.hoursSummary}` });
    blocos.push({ tipo: "texto", texto: `Telefone: ${unidade.phone}` });
    if (unidade.deliveryAreas.length > 0) {
      blocos.push({ tipo: "texto", texto: `Entrega nos bairros: ${unidade.deliveryAreas.join(", ")}` });
    }
    blocos.push({
      tipo: "link",
      texto: `Falar no WhatsApp: ${unidade.shortName}`,
      url: buildWhatsAppUrl(unidade, `Oi, União Farma ${unidade.shortName}! Quero consultar um produto.`, {
        campaign: "app",
        content: `app_unidades_${unidade.id}`,
      }),
    });
  }
  return { titulo: "Unidades e WhatsApp", blocos };
}

/** Novidades: artigos publicados (mesma regra do site) e as artes de novidade, em texto. */
function novidades(): { titulo: string; blocos: Bloco[] } {
  const blocos: Bloco[] = [];
  for (const arte of NEWS_VISUALS) {
    blocos.push({ tipo: "subtitulo", texto: arte.title });
    blocos.push({ tipo: "texto", texto: arte.caption });
  }
  for (const artigo of getPublishedNews()) {
    blocos.push({ tipo: "h2", texto: artigo.title });
    blocos.push({ tipo: "texto", texto: artigo.excerpt });
    for (const bloco of artigo.content) {
      if (bloco.type === "heading") blocos.push({ tipo: "subtitulo", texto: bloco.text });
      else if (bloco.type === "paragraph") blocos.push({ tipo: "texto", texto: bloco.text });
      else for (const item of bloco.items) blocos.push({ tipo: "texto", texto: `• ${item.label}` });
    }
  }
  if (blocos.length === 0) blocos.push({ tipo: "texto", texto: "Nenhuma novidade publicada no momento." });
  return { titulo: "Novidades", blocos };
}

/** Encarte da semana: texto e WhatsApp de cada loja (mesma informação da página de encarte do site). */
function encarte(): { titulo: string; blocos: Bloco[] } {
  const blocos: Bloco[] = [
    { tipo: "texto", texto: "Ofertas da semana da União Farma. Escolha a loja e peça no WhatsApp." },
  ];
  for (const unidade of PUBLIC_UNITS) {
    blocos.push({ tipo: "subtitulo", texto: unidade.shortName });
    blocos.push({
      tipo: "link",
      texto: `Pedir em ${unidade.shortName} pelo WhatsApp`,
      url: buildWhatsAppUrl(unidade, `Oi, União Farma ${unidade.shortName}! Vi as ofertas da semana no app.`, {
        campaign: "app",
        content: `app_encarte_${unidade.id}`,
      }),
    });
  }
  return { titulo: "Encarte da semana", blocos };
}

const PAGINAS: Record<string, () => { titulo: string; blocos: Bloco[] }> = {
  institucional,
  perguntas,
  privacidade,
  termos,
  unidades,
  novidades,
  encarte,
};

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("p") ?? "";
  const pagina = PAGINAS[slug];
  if (!pagina) return Response.json({ erro: "nao_encontrada" }, { status: 404, headers: { "cache-control": "no-store" } });
  return Response.json(pagina(), { headers: { "cache-control": "no-store" } });
}
