# GitHub + Cloudflare (Uniao Farma)

O codigo ja gera um Worker Cloudflare no `npm run build` (`dist/server/wrangler.json`).
Este guia liga o repositorio ao painel para o `push` no `main` publicar o site.

## 1. Token no Cloudflare

1. Abre https://dash.cloudflare.com/?to=/:account/api-tokens
2. Create Token
3. Usa o modelo **Edit Cloudflare Workers** (Workers Scripts: Edit, Account: Read, Users: Read)
4. Limita o token a esta conta
5. Copia o token uma vez

Account ID: no dashboard, Workers & Pages, o identificador da conta esta na barra lateral direita.

## 2. Secrets no GitHub

No repositorio `site-uniao-farma`:

1. Settings
2. Secrets and variables
3. Actions
4. New repository secret, duas vezes:

- `CLOUDFLARE_API_TOKEN` = token do passo 1
- `CLOUDFLARE_ACCOUNT_ID` = Account ID

Nao coloques estes valores no codigo.

## 3. Correr o deploy

Depois dos secrets:

- qualquer push no `main` dispara o workflow **Deploy Cloudflare**
- ou Actions > Deploy Cloudflare > Run workflow

O job faz `npm ci`, `npm run build` e `wrangler deploy --config dist/server/wrangler.json`.

## 4. Caminho alternativo (sem Actions)

No Cloudflare Dashboard:

1. Workers & Pages
2. Create / Connect to Git
3. Autoriza GitHub e escolhe `thiagofelipegm7-pixel/site-uniao-farma`
4. Build command: `npm run build`
5. Deploy command: o Wrangler usa `dist/server/wrangler.json`

## Aviso

O dominio `uniaofarmasabara.com.br` ja esta no ar via Vinext / OpenAI Sites (`project_id` em `.openai/hosting.json`).
Se esse painel continuar a publicar, podes ter **dois deploys** a competir.
Nesse caso fica so com uma origem: ou o Sites, ou este workflow.
