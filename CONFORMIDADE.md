# CONFORMIDADE E BOAS PRÁTICAS DE FARMÁCIA ONLINE

**Escopo:** todo o site da União Farma (páginas, componentes, textos, ofertas, formulários, dados, SEO, desempenho).
**Origem:** "União Farma — Guia baseado em evidências para um site de farmácia de excelência" (26/11/2026, Thiago Felipe), com fontes de Anvisa, ANPD, W3C, Google, Baymard e outras. As fontes e as estatísticas **não foram verificadas por IA**: tratar como direção, não como garantia.
**Aviso:** este documento não é parecer jurídico. Qualquer dúvida legal é validada com o farmacêutico responsável técnico (RT), o jurídico e a vigilância sanitária local antes de publicar.
**Obrigatoriedade:** cumprimento rigoroso.

## Lugar na ordem de prioridade

Ordem geral do projeto: 1) `ACCESSIBILITY.md`, 2) `CONVERSAO.md`, 3) direção artística do `CLAUDE.md`.

- **Regras R-xx (legais):** são **limites** que nenhuma das três regras acima pode violar. Se acessibilidade, conversão ou direção artística pedirem algo que viole R-xx, vale R-xx.
- **Regras V-xx e P-xx (confiança e boas práticas):** valem no mesmo nível da conversão (nº 2): abaixo da acessibilidade e acima da direção artística.
- Em qualquer conflito, diga na resposta qual regra venceu.

## Como aplicar

1. Antes de mudar página, oferta, formulário, texto de produto, dados ou publicidade, leia as regras que a mudança toca.
2. Cite os IDs aplicados na resposta ou no Pull Request (ex.: "R-06, P-13").
3. Regra legal sem certeza de interpretação: **não publique**; escale ao RT/jurídico (R-15).

---

## R — Obrigações legais (Brasil)

- **R-01 Venda remota (RDC 44/2009, arts. 52 a 59):** só farmácia ou drogaria aberta ao público e **com farmacêutico responsável presente em todo o horário** vende por meio remoto. O pedido é feito no site do próprio estabelecimento ou da rede, com domínio `.com.br`.
- **R-02 Dados da empresa na página principal:** razão social, nome fantasia, CNPJ, endereço completo, horário de funcionamento e telefone. Reforçado pelo Código de Defesa do Consumidor (R-12).
- **R-03 Farmacêutico RT:** nome e número de inscrição no CRF do Farmacêutico Responsável Técnico, visíveis.
- **R-04 Licenças:** Licença/Alvará Sanitário, **AFE** (Anvisa) e, quando aplicável, AE, visíveis (o rodapé de todas as páginas mostra Alvará e AFE; um teste confere).
- **R-05 Receita:** aviso claro de que medicamento sob prescrição (não controlado) **só é dispensado depois que o farmacêutico avalia a receita** (envio por upload, e-mail etc.).
- **R-06 Medicamento de prescrição não se promove:** **nenhuma imagem, propaganda ou promoção** de medicamento sob prescrição em qualquer parte do site. Divulgar o **preço** é permitido. Vale para vitrines, destaques, "mais pedidos", banners, e-mail, push e redes.
- **R-07 Controlados (Portaria 344/98):** fora da venda online. A exceção da pandemia (RDC 683/2022) terminou em 21/05/2023.
  - **Decisão do Thiago (27/11/2026):** controlados (Portaria 344) e antibióticos **seguem com preço e cesta no site**, com retirada só no balcão e receita retida. A chave é `SEM_VENDA_NO_SITE = false` em `app/nacoes-unidas/produtos/sem-venda.ts` (e a cópia em `scripts/gerar-assets-catalogo.mjs`).
  - **Risco registrado:** essa decisão contraria o texto desta regra. Fica sob responsabilidade da empresa, a validar com o farmacêutico RT, o jurídico e a vigilância sanitária (R-15).
  - **Para quem trabalha no site:** não religue a chave sem pedido do Thiago. Também não use esta regra para tirar esses itens da venda por conta própria.
- **R-08 Canal direto com o farmacêutico:** comunicação imediata (WhatsApp, telefone ou chat) sempre visível.
- **R-09 Entrega:** cartão impresso com nome do farmacêutico, telefone e endereço, e orientação para dúvidas (processo da loja; o site não pode contrariar).
- **R-10 Publicidade (RDC 96/2008):** só **medicamento isento de prescrição (MIP)** pode ser divulgado ao público em geral. Peça de MIP traz as advertências exigidas, com texto legível e contrastante. Mesmas regras para banner, e-mail, push e post.
- **R-11 LGPD, dado de saúde é sensível** (art. 5º, II; art. 11):
  - consentimento **específico e destacado** (ou outra base do art. 11);
  - histórico de compra de medicamento ligado a CPF revela condição de saúde: tratar como dado sensível;
  - separar o CPF da nota fiscal do CPF do programa de fidelidade;
  - não condicionar desconto ao consentimento de forma opaca;
  - banner de cookies com opção de **recusar**; política de privacidade clara;
  - receita enviada guardada com acesso restrito e prazo de retenção definido.
- **R-12 Consumidor (CDC e Decreto 7.962/2013):** razão social, CNPJ e endereço visíveis; **frete e prazo informados cedo**; direito de arrependimento de 7 dias após o recebimento (a política, inclusive para medicamento, é definida com o jurídico).
- **R-13 Acessibilidade (Lei 13.146/2015, art. 63):** obrigatória por lei. O projeto aplica o nível AAA (`ACCESSIBILITY.md`).
- **R-14 Marketplaces:** a Lei 15.357/2026 e a Resolução-RE 3.056/2026 mudam a regra, mas a aplicação plena depende de regulamentação ainda não editada. O site próprio é o canal mais seguro: **não entrar em marketplace nem app de entrega** antes de ler a regulamentação final e validar com o jurídico.
- **R-15 Dúvida de interpretação:** há fontes que divergem (ex.: material do Sebrae diz que medicamento com receita só se vende em loja física; o resumo da Vigilância de SP sobre a RDC 44 admite avaliação da receita pelo farmacêutico). Em dúvida, confirmar com a vigilância local e não publicar.

## V — Confiança verificável

- **V-01 Registros clicáveis:** o número da AFE e o do CRF levam à consulta pública oficial (Anvisa e conselho regional), como o selo comum da União Europeia.
- **V-02 Página "Por que comprar com segurança":** farmacêutico (foto, nome, CRF), endereço das lojas, receita obrigatória e política de privacidade.
- **V-03 Selos só reais e verificáveis** (SSL, Reclame Aqui, avaliações do Google). Nunca selo decorativo ou inventado.

## P — Boas práticas (desempenho, compra, busca, SEO, atendimento)

### Velocidade e base técnica
- **P-01 Core Web Vitals** (75º percentil, dados reais): LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.
- **P-02 Celular primeiro:** a versão mobile é a que vale para o Google; a maioria dos compradores brasileiros finaliza no celular.
- **P-03 Imagens** em WebP/AVIF com largura e altura fixas (evita CLS); `lazy-load` abaixo da dobra.
- **P-04 CDN e cache;** TTFB baixo.
- **P-05 Scripts de terceiros** (chat, pixels, pop-ups) limitados: são os maiores vilões de INP.
- **P-06 HTTPS** em todo o site.
- **P-07 Monitorar** o relatório Core Web Vitals do Search Console e o PageSpeed Insights.

### Compra
- **P-08 Frete e prazo cedo:** calculadora de CEP na página do produto e no carrinho; mostrar "retirar na loja" e entrega por bairro. Custo extra tardio é a principal causa de abandono (cerca de 40%).
- **P-09 Compra como visitante:** cadastro opcional depois (obrigar conta faz cerca de 18% abandonarem).
- **P-10 Checkout enxuto:** poucos campos, endereço preenchido pelo CEP, sem menu principal.
- **P-11 Receita dentro do fluxo:** upload no checkout, com explicação de que o farmacêutico avalia e com prazo de resposta (ver R-05).
- **P-12 Pagamento:** Pix com QR e "copia e cola", cartão parcelado, carteiras digitais, e pagamento na entrega ou retirada se a operação suportar. **Atenção:** por decisão do Thiago, o Pix e o QR da cesta estão **fora da publicação**; não reintroduzir sem pedido dele.

### Busca e produto
- **P-13 Busca interna:** autocompletar; sinônimos marca ↔ princípio ativo ↔ genérico; tolerância a erro de digitação; filtros por apresentação e quantidade; busca por conteúdo que não é produto ("troca", "receita", "horário"). Busca por sintoma respeita R-06 e R-10.
- **P-14 Página de produto:** foto nítida em fundo branco; nome completo (marca + princípio ativo + dosagem + quantidade); preço; disponibilidade por loja; prazo de entrega; bula e advertências obrigatórias; botão "falar com o farmacêutico". Medicamento de prescrição: só informação técnica e preço, sem apelo promocional (R-06).

### Prova social
- **P-15 Avaliações:** usar em dermocosméticos, higiene, conveniência e no atendimento e entrega. **Evitar em medicamento sob prescrição**, onde pode virar promoção (inferência das RDC 44 e 96; validar com o RT). Selo de "comprador verificado". Só avaliação **real** (L-1 do `CONVERSAO.md`). Nota perfeita gera desconfiança: nunca arredondar ou embelezar.

### SEO
- **P-16 Saúde é YMYL:** conteúdo de saúde assinado por farmacêutico identificado (nome + CRF), com data de revisão e fontes (Anvisa, bulas); página "Quem somos" com história, lojas e equipe. Publicação só depois da revisão (`CLAUDE.md`).
- **P-17 SEO local:** Perfil da Empresa no Google verificado por loja (categoria "Farmácia", horários inclusive feriados, fotos, telefone/WhatsApp, link do site), responder todas as avaliações; **uma página por loja** (endereço, mapa, horário, serviços, farmacêutico).
- **P-18 Dados estruturados:** `Product` + `Offer` (preço, disponibilidade, frete, devolução); `LocalBusiness`/`Pharmacy` nas lojas; `Organization` e `BreadcrumbList`. **Devem coincidir com o que o usuário vê.** Feed no Google Merchant Center. Para respostas de IA do Google não há requisito extra: valem as boas práticas (rastreamento, links internos, boa experiência, conteúdo útil e único).

### Público idoso
- **P-19** Muitos clientes têm 65 anos ou mais (mais lentos e com menor taxa de sucesso em tarefas): fonte base ≥ 16 px, alto contraste, botões grandes, linguagem simples, telefone e WhatsApp sempre visíveis, sem mudança brusca de layout, formulário com rótulo claro e erro específico. Isso já é coberto e superado por `ACCESSIBILITY.md`.

### Atendimento
- **P-20 WhatsApp** é o canal direto com o farmacêutico exigido por R-08: tirar dúvida, receber receita, confirmar pedido, avisar entrega. Defina tempo de resposta (SLA) e horários, e registre as orientações. Chatbot só faz triagem; **orientação farmacêutica é feita por farmacêutico**.

## Métricas (metas iniciais sugeridas)

| Área | Indicador | Meta |
| --- | --- | --- |
| Velocidade | LCP / INP / CLS | ≤ 2,5 s / ≤ 200 ms / ≤ 0,1 |
| Conversão | Abandono de carrinho | Abaixo da média de cerca de 70% |
| Busca | % de buscas sem resultado | Reduzir mês a mês |
| Local | Nota e nº de avaliações no Google por loja | Crescimento contínuo |
| Atendimento | Tempo de 1ª resposta no WhatsApp | SLA definido (ex.: < 5 min em horário comercial) |
| Conformidade | Auditoria trimestral de R-01 a R-15 | 100% |

## Plano por fases (do guia)

1. **Fundação:** R-01 a R-12 completos na home e no rodapé; privacidade, cookies, termos, trocas e devoluções; hospedagem rápida, HTTPS, mobile-first; Perfil do Google e página por loja.
2. **Conversão:** busca com sinônimos e tolerância a erro; frete por CEP e retirada; compra como visitante; Pix (ver P-12) e cartão parcelado; receita no checkout e WhatsApp do farmacêutico.
3. **Crescimento:** dados estruturados e Merchant Center; avaliações verificadas (só categorias permitidas); conteúdo de saúde assinado; auditoria de acessibilidade com usuários idosos; acompanhar a regulamentação da Lei 15.357/2026.

## Limites do guia de origem

- Não analisou o site atual da União Farma.
- A estatística de conversão vem de estudos globais e dos EUA: é direção, não garantia.
- A regulação de venda online de medicamentos **muda em 2026**: reconferir R-14 e R-15 periodicamente.

## Lista final (responder sim a todas)

- Nenhuma imagem, promoção ou destaque de medicamento de prescrição (R-06, R-10)?
- Controlado e antibiótico com retirada só no balcão e receita retida (R-07, ver a decisão de 27/11/2026)?
- Dados do estabelecimento, RT, Alvará e AFE visíveis (R-02 a R-04)?
- Canal com o farmacêutico visível (R-08) e aviso de receita (R-05)?
- Dado pessoal e de saúde tratado como sensível, com cookies recusáveis (R-11)?
- Frete e prazo mostrados cedo (R-12, P-08)?
- Dado estruturado igual ao que se vê (P-18)?
- Nada inventado em avaliação, selo ou depoimento (V-03, P-15, L-1)?
