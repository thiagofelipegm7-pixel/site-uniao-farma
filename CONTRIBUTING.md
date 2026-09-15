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

### As 8 Camadas Semânticas Globais (`app/layout.tsx`)

| Camada | Arquivo | Responsabilidade |
|---|---|---|
| **Tokens** | `app/tokens.css` | Cores (`--uf-green`), espaçamentos (`--space-*`), raios (`--r-*`), tamanhos de toque (`--tap`). |
| **Base** | `app/globals.css` | Reset CSS, import do Tailwind, estilos fundamentais de `html`, `body`, tipografia básica. |
| **Tipografia** | `app/typography.css` | `@layer typography` — hierarquia de títulos, kerning, ajustes de entrelinha e animações de texto. |
| **Layout** | `app/layout-system.css` | `@layer layout` — grids responsivos, containers, ajustes para telas móveis e Core Web Vitals (LCP/INP). |
| **Componentes** | `app/components.css` | `@layer components` — estilos globais de componentes reutilizáveis (cards, rodapé, navegação rápida, etc.). |
| **Tema** | `app/theme.css` | `@layer theme` — paleta de cores ativas, skins e contraste acessível (WCAG AA). |
| **Acessibilidade** | `app/a11y.css` | Regras invioláveis de foco visível (`:focus-visible`), skip-link e áreas mínimas de toque (`>= 48px`). |
| **Overrides** | `app/overrides.css` | `@layer overrides` — refinamentos de compatibilidade final e estados excepcionais. |

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
