# União Farma — Sabará/MG

Site institucional e catálogo de ofertas da **União Farma**, rede de drogarias e perfumarias com três unidades em Sabará/MG (Nossa Senhora de Fátima, Nações Unidas e Itacolomi).

Construído com Next.js 16 + React 19 + TypeScript (strict) + Tailwind CSS 4, compilado via [Vinext](https://github.com/cloudflare/vinext) e publicado em Cloudflare Workers.

---

## Pré-requisitos

- **Node.js**: `>= 22.13.0`
- **npm**: `>= 10.0.0`

---

## Início Rápido

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Gerar build de produção
npm run build
```

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|---|---|---|
| `npm run dev` | `vite` | Inicia o servidor local de desenvolvimento com HMR. |
| `npm run build` | `vinext build && node scripts/normalize-cloudflare-config.mjs` | Compila o projeto com Vinext para Cloudflare Workers. |
| `npm run start` | `vinext start` | Executa o servidor de produção localmente. |
| `npm test` | `node --test tests/...` | Executa a suíte de testes unitários rápidos (a11y, ofertas, novidades, auth, rotas). |
| `npm run test:html` | `npm run build && node --test tests/rendered-html.test.mjs` | Compila e testa o HTML renderizado pelo Worker (SEO, schema.org, acessibilidade). |
| `npm run lint` | `eslint app tests scripts worker db ...` | Valida regras de lint e boas práticas do React/Next. |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.app.json` | Checagem rigorosa de tipos TypeScript sem emitir arquivos. |

---

## Rotas Principais

### Páginas Públicas
- `/` — Página inicial com seleção de unidade, destaques e mapa
- `/ofertas` — Catálogo de ofertas aprovadas com integração direta ao WhatsApp
- `/encarte` — Versão encarte digital para consulta rápida de produtos
- `/receita` — Envio prático de receitas médicas para a unidade mais próxima
- `/novidades` — Central de novidades, comunicados e artigos de saúde
- `/perguntas` — Perguntas frequentes (FAQ) sobre atendimento, entrega e horários

### Páginas das Lojas
- `/fatima` — Loja 1: Rua Cláudio, 902 — Nossa Senhora de Fátima
- `/nacoes-unidas` — Loja 2: Rua Inglaterra, 162 — Nações Unidas
- `/itacolomi` — Loja 3: Rua Joaquim Ferreira Moreira, 489 — Itacolomi

### Campanhas e SEO Local
- `/farmacia-em-sabara` — Landing page de SEO local
- `/entrega-de-medicamentos-em-sabara` — Landing page focada em tele-entrega
- `/perfumaria-em-sabara` — Landing page de perfumaria e cuidados pessoais

### Institucional e Legal
- `/institucional` — Dados da empresa, responsáveis técnicos e licenças
- `/privacidade` — Política de privacidade e conformidade LGPD
- `/termos` — Termos de uso do site

---

## Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` para desenvolvimento local:

```bash
cp .env.example .env
```

### Variáveis de Autenticação (Servidor)
- `STAFF_USER`: Nome de usuário da área interna da equipe (padrão: `uniao`).
- `STAFF_PASSWORD`: Senha de acesso para operadores.
- `STAFF_SECRET`: Chave secreta para assinatura criptográfica da sessão HMAC.

### Variáveis da Meta / WhatsApp Business API
- `WHATSAPP_VERIFY_TOKEN`: Token de verificação do webhook da Meta.
- `WHATSAPP_APP_SECRET`: Segredo do app Meta para validar assinaturas.
- `WHATSAPP_ACCESS_TOKEN`: Token de acesso para envio de mensagens via Cloud API.
- `WHATSAPP_PHONE_ID_FATIMA`: ID do número de WhatsApp da loja de Fátima.
- `WHATSAPP_PHONE_ID_NACOES`: ID do número de WhatsApp da loja Nações Unidas.
- `WHATSAPP_PHONE_ID_ITACOLOMI`: ID do número de WhatsApp da loja Itacolomi.
- `WHATSAPP_AUTO_REPLY`: Liga/desliga auto-resposta (`on` ou `off`).

### Variáveis Públicas de Rastreamento e SEO (Cliente)
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Token de verificação do Google Search Console.
- `NEXT_PUBLIC_GTM_CONTAINER_ID`: ID do contêiner do Google Tag Manager (ex: `GTM-M8BXJCHB`).
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: ID da propriedade do Google Analytics 4 (ex: `G-1N8E5G39KF`).
- `NEXT_PUBLIC_GOOGLE_ADS_ID`: ID de conversão do Google Ads.
- `NEXT_PUBLIC_GOOGLE_ADS_WHATSAPP_LABEL`: Rótulo de conversão para cliques no WhatsApp.
- `NEXT_PUBLIC_GOOGLE_ADS_PHONE_LABEL`: Rótulo de conversão para chamadas telefônicas.
- `NEXT_PUBLIC_GOOGLE_ADS_DELIVERY_LABEL`: Rótulo de conversão para consultas de entrega.

---

## Arquitetura de Estilos (CSS)

O projeto adota uma estrutura modular em **8 camadas semânticas** utilizando Tailwind CSS 4 e `@layer`:

```
app/
├── tokens.css          # Variáveis de design tokens (cores, espaçamentos, tipografia)
├── globals.css         # Configurações globais, reset base e utilitários
├── typography.css      # @layer typography (fontes, kerning, motion, escalas)
├── layout-system.css   # @layer layout (grid, containers, CWV, ajustes responsivos)
├── components.css      # @layer components (cards, cabeçalho, rodapé, carrosséis)
├── theme.css           # @layer theme (esquema de cores, contraste acessível WCAG)
├── a11y.css            # Regras estritas de acessibilidade (foco, skip-links, tap targets)
└── overrides.css       # @layer overrides (polimentos específicos e compatibilidade)
```

Estilos exclusivos de componentes (como `encarte.css`, `offers-polish.css` e `whatsapp-fab.css`) permanecem encapsulados nos seus respectivos módulos.

---

## Integração Contínua e Deploy (CI/CD)

O deploy é automatizado via GitHub Actions (`.github/workflows/deploy-cloudflare.yml`):

1. **Lint** (`npm run lint`) — zero tolerância para erros de lint.
2. **Typecheck** (`npm run typecheck`) — checagem estrita de tipos TypeScript.
3. **Testes unitários** (`npm test`) — 12 testes validando regras de negócio, SEO e acessibilidade.
4. **Build** (`npm run build`) — compilação do bundle para Cloudflare Workers.
5. **Testes de HTML renderizado** (`node --test tests/rendered-html.test.mjs`) — validação ponta a ponta do HTML final gerado pelo Worker.
6. **Deploy** — publicação automática no Cloudflare Workers após aprovação de todos os gates de qualidade.
