# ACESSIBILIDADE — WCAG 2.2 nível AAA (PRIORIDADE 1)

**Escopo:** todo código de interface do site da União Farma (HTML, CSS, componentes React, textos, formulários, imagens).
**Prioridade:** regra nº 1 do projeto. Vence `CONVERSAO.md` (nº 2) e a direção artística do `CLAUDE.md` (nº 3). Nunca cede a elas.
**Obrigatoriedade:** cumprimento rigoroso. Toda mudança de interface é entregue conforme estas regras ou com exceção registrada (ver A-20).

## Como aplicar (para IAs e desenvolvedores)

1. Antes de escrever, leia as regras A-01 a A-19.
2. Ao escrever, aplique cada regra que a mudança toca.
3. Antes de entregar, rode a verificação (seção "Verificação") e a lista final.
4. Se o nível AAA for inviável num ponto, garanta no mínimo AA e registre a exceção (A-20). Nunca entregue abaixo de AA.
5. Em conflito com conversão ou direção artística: acessibilidade vence. Diga na resposta qual regra venceu.

## Regras

### Percepção
- **A-01 Contraste de texto:** texto normal ≥ **7:1**; texto grande (≥ 24 px, ou ≥ 18,66 px em negrito) ≥ **4,5:1**. Vale também para texto sobre imagem e sobre fundo colorido.
- **A-02 Contraste de não texto:** bordas de campo, ícones informativos, estados de foco e partes de gráficos ≥ **3:1** contra o fundo vizinho.
- **A-03 Imagens:** imagem informativa tem `alt` descritivo (diz o que mostra e para que serve). `alt=""` só em imagem puramente decorativa. Nunca texto importante dentro de imagem.
- **A-04 Independência de cor:** nenhuma informação só por cor. Estado, erro, seleção e desconto também têm texto, ícone ou forma diferente.
- **A-05 Tipografia escalável:** tamanhos, espaçamentos e larguras de texto em `rem`/`em`, nunca fixos em `px` para texto. A página continua usável com zoom de 200% e texto aumentado, sem perda de conteúdo nem rolagem horizontal.
- **A-06 Leitura:** entrelinha ≥ 1,5 no texto corrido; linhas de até ~80 caracteres; texto não justificado; linguagem simples (evite jargão sem explicação; explique sigla e termo técnico na primeira vez).

### Operação (teclado e toque)
- **A-07 Teclado completo:** tudo que o mouse faz, o teclado faz, sem armadilha de foco. Ordem de tabulação segue a ordem visual.
- **A-08 Foco visível:** `:focus-visible` nunca removido nem desativado; indicador com contraste ≥ 3:1 e espessura mínima de 2 px. Esta regra autoriza contorno mesmo onde a direção artística diz "sem linha".
- **A-09 Skip link:** o primeiro elemento focável do `<body>` é o skip link ("Pular para o conteúdo"), visível ao receber foco e funcional.
- **A-10 Alvo de toque:** todo elemento interativo com área mínima de **48 × 48 px** (largura e altura). Exceção legal da WCAG: link dentro de frase. O espaço entre alvos conta; a área clicável pode ser maior que o desenho (padding, `<label>`).
- **A-11 Sem pressa:** nada some, avança ou muda sozinho sem controle do usuário (pausar, parar, ajustar). Sem limite de tempo em formulário ou cesta.

### Compreensão
- **A-12 Estrutura semântica:** landmarks (`header`, `nav`, `main`, `footer`, `aside`); um `<h1>` por página; títulos hierárquicos, sem pular nível; listas em `<ul>/<ol>`; todo conteúdo dentro de um landmark. Dois landmarks do mesmo tipo têm `aria-label` diferentes.
- **A-13 HTML nativo primeiro:** `<button>` para ação, `<a href>` para navegação, `<label>` ligado a cada campo. ARIA só quando o HTML nativo não resolve. Botão que abre/fecha algo tem `aria-expanded` e `aria-controls`.
- **A-14 Nome acessível:** todo controle tem nome que diz o que faz ("Remover Dipirona da cesta", não "Remover" nem "WhatsApp no WhatsApp"). Links iguais com destinos diferentes têm nomes diferentes.
- **A-15 Formulários:** rótulo visível em todo campo, `autocomplete` correto, erro dito em texto junto ao campo e com sugestão de correção. Nunca só placeholder como rótulo.
- **A-16 Idioma e previsibilidade:** `lang="pt-BR"` no documento; navegação e componentes iguais em todas as páginas; nada de mudança de contexto ao só receber foco.
- **A-17 Anúncios dinâmicos:** conteúdo que muda sem navegação (quantidade, erro, carregando) é anunciado com `role="status"`/`aria-live` adequado.

### Robustez e processo
- **A-18 Sem ID duplicado** e HTML válido; componentes não quebram leitores de tela nem com JavaScript atrasado.
- **A-19 Testes:** testes automáticos de acessibilidade existentes (`tests/a11y-static.test.mjs`, `tests/a11y-rendered.test.mjs`, `tests/acessibilidade-auditoria.test.mjs`) continuam passando. Nenhuma correção pode desativar ou afrouxar um teste só para passar.
- **A-20 Exceções:** AAA inviável em um ponto? Garanta AA e registre no corpo do Pull Request e na tabela abaixo: critério afetado, motivo, alternativa oferecida. Sem registro, não é exceção, é erro.

## Verificação (rodar antes de entregar)

1. `npm test` — todos os testes passam.
2. axe-core (já em `node_modules/axe-core`) em cada página alterada, **celular 390 px** e **desktop 1280 px**, com as tags `wcag2a, wcag2aa, wcag2aaa, wcag21a, wcag21aa, wcag22aa, best-practice`. **Meta: 0 violações.** Itens "incompletos" de contraste (texto sobre imagem) exigem conferência manual.
3. Conferir à mão: tabular a página inteira só com teclado; zoom 200%; um leitor de tela (TalkBack/VoiceOver) nos fluxos de compra e receita.
4. Medir alvos interativos: nenhum abaixo de 48 px, exceto exceções registradas.

## Exceções registradas

| ID | Onde | Critério | Motivo | Alternativa |
| --- | --- | --- | --- | --- |
| E-01 | Bolinhas do carrossel de banners | A-10 (alvo 48 px; largura é 24 px, altura 48 px) | 14 bolinhas de 48 px não cabem na largura de um celular | Atende AA (24 px); carrossel também navega por deslize e, no desktop, por setas de 48 px |
| E-02 | Caixinhas de seleção da cesta | A-10 (o `<input>` tem 24 px) | Campo nativo menor que a área clicável | `<label>` de 48 × 48 px envolve o campo e aciona o mesmo controle |

## Lista final (responder sim a todas)

- Contraste 7:1 (4,5:1 em texto grande) conferido, inclusive sobre imagens?
- Nenhum alvo < 48 px sem exceção registrada?
- Foco visível, teclado completo e skip link funcionando?
- `alt`, rótulos e nomes de controles descritivos?
- Título sem pular nível; todo conteúdo em landmark?
- Nada depende só de cor?
- `npm test` e axe-core sem violações em 390 px e 1280 px?
- Exceções registradas, se houver?
