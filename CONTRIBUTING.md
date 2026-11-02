# Guia de Contribuição e Padrões de Manutenibilidade

Este documento define as convenções de código, arquitetura e processos de garantia de qualidade para o projeto da **União Farma**. O objetivo é manter o índice de manutenibilidade próximo de **10/10**, sem acumular arquivos de patch ou introduzir regressões.

---

## 1. Fluxo de Validação Obrigatório (Gates de Qualidade)

Antes de abrir qualquer commit ou Pull Request, execute os seguintes passos localmente na ordem abaixo. Se qualquer comando falhar, o deploy no Cloudflare Workers será bloqueado pelo CI:

```bash
# 1. Validação de Lint (zero erros / avisos)
npm run lint

# 2. Checagem Estrita de Tipos TypeScript
npm run typecheck

# 3. Testes Unitários de Negócio e Acessibilidade
npm test

# 4. Build de Produção
npm run build

# 5. Testes de HTML Renderizado e SEO (requer o build prévio)
node --test tests/rendered-html.test.mjs
```

---

## 2. Arquitetura de Estilos e Convenção CSS

O projeto utiliza **Tailwind CSS 4** com organização explícita através de diretivas `@layer`.

### O Que NÃO Fazer
- **Nunca crie arquivos de patch pontual** (ex: `audit-fix.css`, `final-polish.css`, `score-10.css`, `mobile-fixes.css`).
- **Nunca sobrescreva regras usando seletores redundantes ou `!important` desnecessário**. Quando precisar ajustar um estilo, edite a regra diretamente na camada correta.

### Arquivos globais (`app/layout.tsx`), na ordem de carregamento

| Arquivo | Camada | Responsabilidade |
|---|---|---|
| `app/tokens.css` | — | Ordem das camadas (`@layer design, typography, layout, components, theme, overrides`) e variáveis legadas (`--uf-*`, `--space-*`, `--r-*`, `--tap`). |
| `app/globals.css` | sem camada | `@import "tailwindcss"`, **tokens de design em `@theme`** (`--color-*`, `--spacing-*`, `--radius-*`, `--text-*`, `--shadow-*`), base, componentes legados, acessibilidade (skip-link, foco, toque) e ajustes visuais finais. |
| `app/typography.css` | `typography` | Hierarquia de títulos, entrelinha e animações de texto. |
| `app/layout-system.css` | `layout` | Grids, containers e ajustes de layout no celular. |
| `app/components.css` | `components` | Componentes reutilizáveis (cards, rodapé, barra fixa…). |
| `app/theme.css` | `theme` | Paleta ativa e contraste. |
| `app/overrides.css` | `overrides` | Estados excepcionais e compatibilidade. |
| `app/design.css` | `design` | Sistema visual do DESIGN.md. É a primeira camada declarada, então os `!important` dela vencem as demais. Use só os tokens do `@theme`. |

**Atenção à cascata:** CSS **sem camada** vence qualquer CSS **com camada** (sem `!important`), e entre `!important` vence a camada declarada **primeiro** (`design`). Antes de mudar uma regra, confira em qual camada ela está.

**Como o CSS legado foi enxugado (nov/2026):** cada declaração foi removida e testada no navegador em todas as rotas públicas, em uma largura por faixa de breakpoint e em vários estados (loja aberta e fechada, cookies, menu, modal, FAQ aberto). Só saiu o que não alterava o estilo calculado de nenhum elemento. Se for remover CSS, mantenha esse critério: compare o estilo calculado antes e depois, não só screenshots.

### CSS Escopado de Componente
Componentes específicos que possuem estilos isolados devem mantê-los no mesmo diretório ou referenciá-los localmente (ex: `encarte.css`, `offers-polish.css`, `whatsapp-fab.css`).

---

## 3. Páginas de Unidades Físicas (`/fatima`, `/nacoes-unidas`, `/itacolomi`)

Cada unidade física possui sua própria rota estática em `app/<slug>/page.tsx`:
- **Por que manter separadas?** O Next.js exige export estático de `export const metadata` em nível de módulo para gerar metadados de SEO exclusivos (título, descrição, canonical e Open Graph) em tempo de compilação.
- **Reaproveitamento de código:** A estrutura visual e a lógica da página são 100% centralizadas no componente compartilhado `<NeighborhoodPage unit={unit} />`. As páginas de unidade apenas injetam o objeto `unit` correspondente e o header/footer padrão.

---

## 4. Regras de Negócio de Ofertas e Regulamentação Farmacêutica

O catálogo de ofertas em `app/offers.ts` possui regras regulatórias estritas:
- Produtos controlados (tarjados ou com restrição de publicidade pela Anvisa) possuem classes regulatórias específicas e **nunca** devem ser publicados diretamente ou usados em campanhas de Google Ads sem validação farmacêutica.
- Utilize sempre as funções auxiliares `getPublicOffers()`, `canPublishOffer()` e `canUseInAds()` em vez de filtrar o array de ofertas manualmente.

---

## 5. Acessibilidade (WCAG 2.1 AA)

- Todos os elementos interativos (botões, links, selects) devem ter altura/largura mínima de toque de **48px** (`min-height: 48px`).
- Todo botão que alterna visibilidade de menu deve conter atributos `aria-expanded` e `aria-controls`.
- O skip link (`<SkipLink />`) deve ser sempre o primeiro elemento navegável via teclado no `<body>`.
- Não remova ou desative o indicador de foco `:focus-visible`.
