# CONVERSÃO — 23 Leis Definitivas (PRIORIDADE 2)

**Escopo:** toda página, componente, texto, formulário, chamada para ação (CTA) e oferta do site da União Farma, novos ou alterados.
**Prioridade:** regra nº 2. Perde só para `ACCESSIBILITY.md` (nº 1). Vence a direção artística do `CLAUDE.md` (nº 3).
**Obrigatoriedade:** cumprimento rigoroso. Origem: curso de conversão; as 23 leis abaixo são o padrão permanente do site.

## Como aplicar (para IAs e desenvolvedores)

1. Antes de escrever, identifique a página e a ação que ela quer provocar (comprar, enviar receita, pedir pelo WhatsApp, juntar na cesta).
2. Passe a mudança pelas leis C-01 a C-23. Em cada uma: **Regra** é o que se faz; **Verificar** é o teste de sim/não.
3. Na resposta ou no Pull Request, cite os IDs aplicados (ex.: "apliquei C-10, C-13, C-14").
4. Em conflito: acessibilidade vence conversão; conversão vence direção artística. Diga qual regra venceu.

## Limites inegociáveis (valem para todas as leis)

- **L-1 Nada inventado.** Depoimento, avaliação, número de clientes e caso "antes e depois" só entram se forem **reais e verificáveis**. Sem dado real, não publique a prova (C-07, C-09, C-16, C-17).
- **L-2 Saúde:** conteúdo de saúde só é publicado depois de revisão de farmacêutico (ver `CLAUDE.md`).
- **L-3 Medicamentos e ofertas** seguem as regras regulatórias do projeto (`CONTRIBUTING.md`, `app/offers.ts`). Nenhuma lei de conversão autoriza promover medicamento de forma proibida.
- **L-4 Dados pessoais:** peça só o que a equipe vai usar (C-21) e diga o que acontece com eles (C-14).

---

## Estratégia

### C-01 · Lei da Prioridade
- **Regra:** otimize a conversão do site antes de investir em tráfego pago ou orgânico. Mais conversão reduz o custo por lead.
- **Verificar:** a mudança proposta melhora a taxa de conversão de uma página que já recebe visitas? Se for gasto com tráfego, a página de destino já está otimizada?

### C-02 · Lei da Psicologia sobre a Estética
- **Regra:** não espere resultado só de trocar a cor de um botão ou colocar um formulário na tela. O que converte é a psicologia aplicada e o texto ao redor da oferta, que fazem o visitante querer agir.
- **Verificar:** o texto junto à oferta explica o benefício e responde a dúvida do visitante, ou a mudança é só visual?

### C-03 · Lei da Subpágina Autossuficiente
- **Regra:** trate toda página interna como porta de entrada para tráfego frio (busca, anúncio). Cada uma explica o que a loja faz, traz provas de credibilidade e tem CTA próprio.
- **Verificar:** quem chega direto nesta página, sem passar pela home, entende o que a União Farma oferece, vê uma prova e tem uma ação clara?

### C-04 · Lei da Venda Ativa
- **Regra:** nunca presuma que produto ou serviço conhecido se vende sozinho. Mesmo com demanda estabelecida, a página argumenta e vende o valor da oferta.
- **Verificar:** a página diz por que comprar aqui (preço, entrega, retirada, atendimento) em vez de só listar o produto?

## Credibilidade

### C-05 · Lei da Prova Obrigatória
- **Regra:** se o site não dá motivos explícitos e visíveis para acreditar que o trabalho é bom, o visitante não presume isso.
- **Verificar:** há pelo menos uma prova real e visível (avaliações, registro/alvará, tempo de loja, volume atendido)? (Ver L-1.)

### C-06 · Lei da Primeira Impressão
- **Regra:** visual e acabamento moldam na hora o julgamento sobre produto, atendimento e equipe. Quem construiu o site não o julga com imparcialidade: valide com usuários externos.
- **Verificar:** a primeira tela está sem erro visual, sem texto cortado e sem elemento quebrado, em celular e desktop? Alguém de fora já olhou?

### C-07 · Lei dos Detalhes Específicos Significativos
- **Regra:** use histórias de antes e depois (foto, depoimento, estudo de caso) que liguem a situação atual do cliente ao resultado desejado, sempre com detalhes concretos: idade, profissão, cargo, cidade, números exatos.
- **Verificar:** o depoimento ou caso traz detalhes concretos e é **real** e autorizado? Se for inventado ou genérico, não publique (L-1).

### C-08 · Lei da Visibilidade da Prova
- **Regra:** nunca esconda logotipos, prêmios, avaliações ou casos em páginas isoladas. Posicione-os na dobra superior e imediatamente ao lado de cada CTA.
- **Verificar:** há prova visível na primeira tela e junto de cada botão de conversão?

### C-09 · Lei da Credibilidade Alternativa
- **Regra:** sem depoimentos ainda, construa confiança descrevendo o problema do público com precisão cirúrgica, usando a história pessoal de quem atende para gerar identificação, ou o endosso de figura que o público já respeita.
- **Verificar:** na falta de prova social, o texto descreve o problema do cliente com precisão e usa uma história **verdadeira**? (L-1.)

## Isca atrativa (chamadas de conversão)

### C-10 · Lei da Proibição do Contato Genérico
- **Regra:** elimine chamadas vazias como "Entre em contato", "Faça uma consulta" e "Assine nossa newsletter". Elas têm valor percebido zero e avisam que um vendedor vai abordar o usuário.
- **Verificar:** nenhum botão ou link usa essas frases? Cada CTA diz o que a pessoa **recebe** (ex.: "Ver o preço e retirar hoje", "Enviar a receita e saber o que tem em estoque").

### C-11 · Lei do Próximo Passo Tangível
- **Regra:** toda isca de conversão ajuda o visitante a enxergar a dimensão do problema (diagnóstico, calculadora, simulação visual) ou entrega um roteiro prático até o objetivo dele, reaproveitando etapas que a loja já faz no atendimento.
- **Verificar:** o CTA entrega algo útil e concreto já no primeiro passo?

### C-12 · Lei do Menor Risco Percebido
- **Regra:** quando o público já sabe o que quer, ofereça primeiro uma entrada de baixo atrito (ex.: receber um orçamento) em vez de uma etapa de alto compromisso (ex.: ir presencialmente).
- **Verificar:** a primeira ação pedida é a de menor compromisso possível para quem já decidiu?

## Tratamento de objeções

### C-13 · Lei dos Três Medos
- **Regra:** liste as três principais dúvidas, medos ou receios de constrangimento que impedem o clique e neutralize todos no texto ao lado do formulário ou do botão.
- **Verificar:** as três objeções principais da página estão escritas e respondidas junto do CTA? (Ex.: "e se faltar o remédio?", "quanto é a entrega?", "preciso pagar agora?")

### C-14 · Lei da Transparência Pós-Clique
- **Regra:** nunca deixe o usuário sem saber o que acontece depois de enviar. Diga o próximo passo, o canal de retorno, o prazo e a ausência de compromisso. Na dúvida, o visitante presume o pior.
- **Verificar:** após o clique ou envio, a página diz o que acontece, por qual canal, em quanto tempo e que não há compromisso?

### C-15 · Lei do Diagnóstico Antes da Captura
- **Regra:** em formulários de avaliação, peça primeiro a situação ou o problema do visitante e só na etapa seguinte nome, e-mail ou telefone. A captura de contato vira um diagnóstico útil.
- **Verificar:** os dados de contato vêm depois das perguntas sobre a necessidade?

## Prova social

### C-16 · Lei da Maioria Segura
- **Regra:** nunca deixe o visitante sentir que é o primeiro a arriscar. Mostre avaliações externas e volume de clientes atendidos logo acima da dobra e junto aos botões de conversão.
- **Verificar:** avaliações **reais** e número **real** de clientes aparecem acima da dobra e junto ao CTA? (L-1.)

### C-17 · Lei da Prova Social na Oferta
- **Regra:** além de avaliações da empresa, colete e exiba depoimentos específicos sobre a experiência com a isca gratuita (qualidade da análise, consultoria ou newsletter).
- **Verificar:** existe depoimento **real** sobre a própria oferta ou entrega, e não só sobre a loja? (L-1.)

## Facilidade de uso

### C-18 · Lei do Escorregador ("Regra do Homer Simpson")
- **Regra:** assuma que todo visitante está ocupado, apressado e distraído. Faça do objetivo de conversão o elemento mais visível da página (acima da dobra, à direita) e repita a mesma chamada ao longo da página e em barras fixas.
- **Verificar:** o CTA principal é o elemento mais destacado da primeira tela e se repete mais adiante e em barra fixa? (Respeitando A-10 e A-12 de acessibilidade.)

### C-19 · Lei da Familiaridade
- **Regra:** nunca sacrifique a usabilidade por menus criativos, termos técnicos internos ou layouts inéditos. Use padrões visuais que o usuário já sabe usar por instinto.
- **Verificar:** menu, carrinho, busca e botões seguem o padrão de loja virtual conhecido? Os rótulos são palavras do cliente, não do sistema interno?

### C-20 · Lei do Formulário na Página
- **Regra:** substitua links que abrem aplicativos de e-mail externos (`mailto:`) por formulários integrados à própria página. Menos atrito técnico e conversão rastreável.
- **Verificar:** não há `mailto:` como CTA principal? O envio é rastreado?

### C-21 · Lei da Calibragem de Campos
- **Regra:** evite formulário curto demais (1 ou 2 campos parecem mera coleta de contato) e também excesso de campos ou caixas de texto aberto. Prefira múltipla escolha ou listas suspensas. Só peça telefone se a equipe realmente for ligar.
- **Verificar:** o número de campos é o necessário? Há escolhas prontas em vez de texto livre? Cada telefone pedido será usado?

## Entrega e pós-conversão

### C-22 · Lei da Entrega Estruturada com Seeding
- **Regra:** defina claramente o formato da entrega gratuita (chamada, análise em vídeo por e-mail, proposta ou teste guiado passo a passo), use roteiros objetivos nas ligações e faça menções naturais aos serviços pagos e a casos de sucesso ao longo da entrega.
- **Verificar:** o formato da entrega está definido e há um roteiro de atendimento? Os serviços da loja são mencionados naturalmente durante a entrega?

### C-23 · Lei do Funil Amplo e Plano B
- **Regra:** conversão de 100% em vendas é sinal de funil estreito demais. Aceite que ofertas atrativas trazem leads ainda não prontos ou fora do perfil e monetize-os com um Plano B: sequência contínua de e-mails de nutrição, produtos de entrada ou indicação comissionada.
- **Verificar:** quem não compra agora tem para onde ir (nutrição, produto de entrada, indicação)? (Respeitando L-2, L-3 e L-4.)

---

## Lista final (responder sim a todas)

- Os IDs C-xx aplicados estão citados na resposta ou no Pull Request?
- CTA sem frase genérica, dizendo o que a pessoa recebe (C-10)?
- Prova real visível acima da dobra e junto ao CTA, sem nada inventado (C-05, C-08, C-16, L-1)?
- Três objeções respondidas e próximo passo pós-clique dito (C-13, C-14)?
- Formulário na página, com campos calibrados e dados pedidos só se usados (C-20, C-21, L-4)?
- Passou pela acessibilidade (`ACCESSIBILITY.md`) sem perder?
