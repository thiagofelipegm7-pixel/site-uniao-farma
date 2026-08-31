# União Farma

Site institucional da União Farma, drogaria e perfumaria com três unidades em
Sabará/MG. O projeto usa Next/Vinext e está preparado para hospedagem em Sites.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Rotas principais

- `/` — página inicial
- `/ofertas` — ofertas disponíveis
- `/novidades` — novidades e conteúdos
- `/farmacia-em-sabara` — landing page local
- `/unidades/[slug]` — páginas das unidades

## Rastreamento

O site possui integração de consentimento com Google Tag Manager, Google
Analytics 4 e eventos para WhatsApp, telefone, entrega e seleção de unidade.
Os identificadores públicos ficam em variáveis `NEXT_PUBLIC_*`.

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
npm test
```

Não inclua arquivos `.env`, chaves de API, tokens ou credenciais de produção.
O domínio público é configurado separadamente da origem do código.
