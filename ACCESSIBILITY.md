# Acessibilidade — União Farma

Este projeto **persegue o nível AAA** das Diretrizes de Acessibilidade para o Conteúdo da Web (WCAG 2.2).

## Compromisso

- Toda nova funcionalidade, componente e página deve ser projetada e revisada com o objetivo de atingir (ou manter) conformidade AAA sempre que possível.
- Quando o nível AAA não for viável em um ponto específico (por limitação de design, conteúdo dinâmico ou restrição técnica), o nível AA deve ser garantido e a exceção deve ser documentada.
- Acessibilidade não é um checklist pontual: é requisito contínuo de desenvolvimento, revisão de PR e testes.

## Práticas obrigatórias

- Contraste de texto: meta AAA (7:1 para texto normal, 4.5:1 para texto grande).
- Textos alternativos descritivos em imagens informativas; `alt=""` apenas em imagens puramente decorativas.
- Estrutura semântica (landmarks, headings hierárquicos, listas, botões e links nativos).
- Navegação completa por teclado, foco visível e skip link funcional.
- Tipografia escalável (preferência por unidades relativas como `rem`).
- Independência de cor: informação nunca transmitida apenas por cor.
- Testes automatizados de acessibilidade no CI + validação periódica com leitor de tela e ferramentas (Lighthouse, axe, Accessibility Inspector).

## Como contribuir

Ao abrir um Pull Request que altere interface, HTML, CSS ou componentes interativos:

1. Verifique contraste, textos alternativos, foco e navegação por teclado.
2. Execute os testes existentes de acessibilidade.
3. Se o PR introduzir uma exceção ao AAA, descreva-a no corpo do PR.

Problemas de acessibilidade podem ser reportados como issues com a label de acessibilidade.

---

*Este documento registra o compromisso do projeto de perseguir o nível máximo de acessibilidade (AAA).*
