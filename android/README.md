# União Farma para Android

O aplicativo atende primeiro a unidade Nações Unidas. A interface usa Java 17 e componentes nativos do Android. O módulo Gradle fica separado da compilação do site, conversa com o mesmo Worker e roda a partir do Android 8.0 (API 26).

## Fluxos e fontes

| Fluxo | Fonte reutilizada |
| --- | --- |
| Busca, categorias, apresentação e foto | Catálogos públicos de Nações Unidas e regras de nome, quantidade e foto do site. Itens sem foto aprovada têm um estado explícito. Produtos com receita seguem a lista de consulta do site, sem exibir fotos. |
| Preço e oferta | Preço publicado pelo catálogo e ofertas de `GET /api/ofertas`. A oferta só aparece quando nome, foto e preço correspondem ao produto consultado. |
| Disponibilidade | Estoque publicado e leitura do DMaster quando o servidor tem o token e o contato da loja está dentro da janela do site. A loja confirma o estoque na conversa. |
| Cesta e entrega | As quantidades seguem os limites de `app/reserva/reserva-store.ts`. As unidades públicas, bairros e taxas vêm de `app/site-config.ts` e da regra de cobertura do site. O app guarda a cesta neste aparelho. |
| WhatsApp e pré-venda | O servidor confere a cesta, usa o mesmo gerador de mensagem e monta o link para a unidade. A mesma tabela D1 alimenta `/interno/pre-vendas`. O código permite localizar a conversa se o cliente enviar a mensagem. |

`GET /api/android/catalogo` reúne os campos que as telas nativas precisam. `POST /api/android/pre-vendas` recebe identificadores, quantidades, preços revisados e a escolha de retirada ou entrega. O servidor resolve esses identificadores no catálogo e devolve erro se alguma informação da revisão mudou. Um identificador de tentativa evita gravar duas pré-vendas ao repetir a mesma requisição.

O botão **Continuar no WhatsApp** registra a intenção no painel e abre a mensagem para revisão. A pré-venda começa em **Nova** e não comprova envio de mensagem, reserva de estoque ou conclusão da venda. O restante do atendimento acontece na conversa. Quando há itens com receita, a equipe confirma como apresentá-la e se pode atender a modalidade solicitada.

O app não coleta nome, endereço completo, dados de pagamento ou foto da receita. O bairro selecionado só é usado para validar a entrega e compor o texto do WhatsApp. O painel recebe a modalidade e o resumo dos produtos. O histórico local guarda código, data, modalidade, identificadores e quantidades de até oito pré-vendas por 30 dias, com opção de apagar. O backup do app está desabilitado. A repetição usa os produtos, preços e limites do catálogo atual.

## Executar em desenvolvimento

Requisitos do servidor: Node.js conforme `package.json` e dependências npm. Requisitos do app: JDK 17, Android SDK Platform 35 e Build Tools 34.0.0. Para instalar via USB, instale também Android SDK Platform-Tools. Configure o SDK no Android Studio ou defina `ANDROID_HOME`. O Gradle Wrapper baixa a versão 8.9 na primeira execução.

No PowerShell, a partir da raiz do repositório, configure as credenciais locais da equipe conforme o README do site e inicie o Worker de desenvolvimento com D1 local.

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 4173 --strictPort
```

Em outro terminal, gere o APK de desenvolvimento.

```powershell
.\android\gradlew.bat -p android :app:assembleDebug :app:lintDebug
```

O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Com um emulador em execução, instale com `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` ou abra a pasta `android/` no Android Studio e use **Run**. A configuração padrão do APK debug usa `http://10.0.2.2:4173`, o endereço do computador visto pelo emulador.

Para usar um aparelho conectado por USB, encaminhe a porta e gere o APK com a origem correspondente.

```powershell
adb reverse tcp:4173 tcp:4173
.\android\gradlew.bat -p android :app:assembleDebug "-PapiBaseUrl=http://127.0.0.1:4173"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

O HTTP é limitado aos endereços locais de desenvolvimento. A variante release usa o domínio HTTPS do site e depende da disponibilidade das rotas Android nesse Worker.

## Verificar

O teste de integração grava pré-vendas de retirada e entrega em um **D1 local de teste**, verifica preços, fotos, cobertura, conflitos, repetição da requisição e visibilidade no painel autenticado. Ele inspeciona o link gerado localmente sem abri-lo. Para executar com um banco isolado, compile o Worker e execute o Wrangler a partir da raiz.

```powershell
npm run build
npx wrangler dev --config dist/server/wrangler.json --local --port 4174 --persist-to ./work/android-d1 --var STAFF_USER:uniao --var STAFF_PASSWORD:teste-local --var STAFF_SECRET:assinatura-exclusiva-local
```

Em outro terminal:

```powershell
$env:UF_ANDROID_TEST_URL = "http://127.0.0.1:4174"
$env:STAFF_USER = "uniao"
$env:STAFF_PASSWORD = "teste-local"
node --test tests/android-fluxo.test.mjs
```

No app, pesquise um produto de Nações Unidas, navegue por uma categoria e pelas ofertas, abra a ficha, adicione e altere quantidades na cesta. Na entrega, confira se a unidade lista apenas os bairros atendidos. Feche a conexão e reabra o app para ver os dados consultados anteriormente e a indisponibilidade do envio offline. Para testar o histórico e a repetição, use somente a base local de teste e volte da tela do WhatsApp antes de enviar a mensagem.
