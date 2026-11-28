# Lista de Ouro de Copywriting e UX Writing — Farmácia União Farma

Curadoria das **30 técnicas de maior impacto para farmácia** extraídas diretamente de [`LEIS-DE-COPY.md`](../LEIS-DE-COPY.md) (10.346 termos), mapeadas para os 5 fluxos críticos do site. Respeita integralmente `CONFORMIDADE.md` (`R-xx`), `ACCESSIBILITY.md` (`A-xx`), `CONVERSAO.md` (`C-xx`), `COPYWRITING.md` (`W-xx`) e `CLAUDE.md`.

---

## Fluxo 1 — Cesta e Envio (`/reserva`)
1. **Divulgação de estado vazio** *(linha 10)*: cesta vazia sempre explica benefício ("pague só na retirada ou na entrega") e dá 1 ação imediata ("Repetir último pedido" ou "Ver produtos").
2. **Amortecimento da dor do pagamento** *(linha 41)*: reforçar que nada é cobrado no site e o pagamento ocorre só na entrega ou no balcão.
3. **Confirmação de retirada em loja com endereço** *(linha 396)*: mostrar bairro + rua exata da loja no resumo antes de enviar.
4. **Sinalização de atendimento assíncrono e horário contextualizado** *(linhas 49 e 53)*: avisar quando a loja está fechada e informar que responde ao abrir; quando aberta, informar o SLA real (em até 5 minutos).
5. **Mudança de disponibilidade durante checkout + recuperação com ação específica** *(linhas 33, 35 e 393)*: se um item acabar no passo final, nomear exatamente o botão que resolve (*"Editar minha cesta"*).
6. **Microcopy de histórico e recompra rápida** *(linha 17)*: oferecer *"Repetir meu último pedido"* com contagem exata de itens.
7. **Consentimento granular revogável + motivo do dado** *(linhas 128 e 138)*: explicar por que o WhatsApp é pedido, prazo de retenção e como sair (*"responda SAIR"*).
8. **Taxa adicional antes da etapa final** *(linha 244)*: mostrar taxa de entrega por bairro antes do passo final, sem surpresa tardia.

## Fluxo 2 — Página de Produto (`/nacoes-unidas/produtos/[slug]`)
9. **Desambiguação de apresentação, concentração e embalagem** *(linhas 50 e 78)*: deixar claro princípio ativo, mg/mL e quantidade de unidades/comprimidos.
10. **Neutralização de ansiedade de estoque** *(linha 44)*: avisar indisponibilidade com transparência e oferecer alternativas comparáveis sem inventar escassez (*"Resta N"* proibido).
11. **Produto fora de estoque com alternativas comparáveis** *(linha 233)*: sugerir similares apenas para higiene/beleza/cuidado diário (nunca remédio, `R-06`).
12. **Inversão de risco explícita** *(linha 9763)*: *"Adicionar à cesta não cobra nada e não obriga a comprar"* + link para trocas e devoluções.
13. **Desambiguação de canal direto humano** *(linha 47)*: deixar claro que a dúvida de produto/remédio vai para o farmacêutico da loja, não para robô (`P-20`).
14. **Ponte Benefício + "Porque" + Recurso** *(`W-23`)*: conectar cada vantagem ao mecanismo real da farmácia.

## Fluxo 3 — Busca e Navegação
15. **Texto de autocompletar e sugestão de busca** *(linha 12)*: sugerir termos populares sem remédio e tolerar erros de digitação.
16. **Ausência de resultados com expansão de consulta** *(linha 116)*: quando a busca não achar nada, sugerir termos próximos ou falar com a loja no WhatsApp.
17. **Rotulagem de ordenação e filtros ativos com remoção individual** *(linhas 56 e 117)*: deixar claro o critério aplicado e permitir limpar cada filtro em 1 toque.
18. **Lei de Hick-Hyman na estruturação de menus e opções** *(linha 81)*: reduzir escolhas simultâneas para evitar paralisia, especialmente no celular e para público 65+.

## Fluxo 4 — Leitura de Receita (`/receita`)
19. **Bloco prévio de pré-requisitos e insumos** *(linha 34)*: avisar antes do botão o que funciona (foto nítida inteira ou PDF do Memed).
20. **Aviso de privacidade em camadas** *(linha 9823)*: explicar em 1 frase junto ao botão que a foto/PDF não fica salva no site e dar link para a política completa.
21. **Descompressão de risco social e discrição** *(linha 9764)*: tom acolhedor e sem julgamento para envio de receita e dúvidas de saúde.
22. **Desambiguação de autoridade farmacêutica** *(linha 9765)*: exibir nome real do RT (`João Victor dos Santos`) e `CRF/MG 31958` clicável para consulta oficial.
23. **Carregamento frontal de restrições regulatórias** *(linha 9810)*: avisar claramente antes do envio que prescrição exige avaliação do farmacêutico e controlados (Portaria 344/98) não são vendidos online.

## Fluxo 5 — Home, Ofertas, Entrega e Confiança
24. **Sinalização de vigência e estoque** *(linha 55)*: mostrar data de conferência do encarte e validade *"enquanto durar o estoque"*.
25. **Rotulagem de limite de área de cobertura** *(linha 59)*: tabela transparente de bairros atendidos e taxas exatas, sem promessa vaga.
26. **Texto de identificação legal e responsabilidade técnica** *(linha 9770)*: razão social, CNPJ, RT, CRF clicável, Alvará e AFE clicável no rodapé e em `/institucional`.
27. **Espelhamento literal de rótulos da interface nas instruções** *(linha 35)*: instrução sempre repete o nome exato do botão que o usuário vê.
28. **Mensagens de erro construtivas sem apagar entradas válidas** *(linhas 51 e 134)*: dizer qual campo falhou, por quê e como corrigir, mantendo o que já foi preenchido.
29. **Pedido de avaliação sem bloquear a tarefa** *(linha 389)*: pedir avaliação real no Google só após conclusão e com consentimento.
30. **Auditoria de truncamento de strings e estouro em mobile** *(linha 76)*: revisar botões e rótulos em 390 px e zoom 200% para nada cortar nem sair da tela.
