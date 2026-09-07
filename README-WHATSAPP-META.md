# Configurar o webhook do WhatsApp Cloud API

Use este passo a passo no painel da Meta. O endpoint público é:

`https://xn--uniofarmasabar-8gbu.com.br/api/whatsapp/webhook`

1. Acesse `developers.facebook.com`, abra o app da União Farma e entre em **WhatsApp → Configuration**. Em algumas contas o caminho aparece como **Use cases → Customize → Configuration**.
2. Em **Callback URL**, cole o endpoint acima.
3. Em **Verify token**, informe exatamente o mesmo valor usado em `WHATSAPP_VERIFY_TOKEN`.
4. Clique em **Verify and save**.
5. Em **Manage**, inscreva o campo **messages**.
6. Anote o **Phone Number ID** de cada número Cloud API e preencha:
   - `WHATSAPP_PHONE_ID_FATIMA`
   - `WHATSAPP_PHONE_ID_NACOES`
   - `WHATSAPP_PHONE_ID_ITACOLOMI`

No Cloudflare, abra **Workers & Pages → o Worker do site → Settings → Variables and Secrets → Production** e crie os cinco secrets do `.env.example`: `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` e os três `WHATSAPP_PHONE_ID_*`. Use **Encrypt** e faça um novo deploy depois de salvar. Nunca coloque os valores no GitHub.

Como os contadores e a deduplicação são permanentes, o Worker também precisa de um binding D1 com o nome `DB`: em **Settings → Bindings → Add → D1 database**, escolha a base do site e use `DB` como variável. O deploy deve aplicar a migration que está em `drizzle/`.

O painel da Meta fornece o **App Secret** em **App settings → Basic**. Ele deve ser salvo somente como `WHATSAPP_APP_SECRET`; o webhook usa esse secret para validar `X-Hub-Signature-256`.

Para testar, envie uma mensagem real para um dos números Cloud API e abra `/interno/metricas`. O evento deve aparecer como `conversation_received`, sem texto, nome ou telefone do cliente. Clique no site é `whatsapp_click`; pedido concluído só é marcado pela loja como `order_completed`.
