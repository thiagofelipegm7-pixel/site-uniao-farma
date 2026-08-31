# Time Hermes da União Farma

Este diretório contém a configuração segura do time de agentes para publicidade da União Farma.

## Arquitetura

- **Buzz:** comunicação entre você e os agentes.
- **Hermes:** execução dos perfis, tarefas e rotinas.
- **Modelo configurado no Hermes:** motor usado pelos agentes, definido na configuração local do Hermes.
- **Google Ads e GA4:** fontes de dados para análise.

## Agentes

- `diretor-performance`
- `analista-google-ads`
- `analista-ga4`
- `especialista-palavras-chave`
- `redator-anuncios`
- `landing-page-cro`
- `criativos-instagram`
- `fiscal-anvisa`
- `controlador-aprovacoes`

Os prompts individuais estão em `agents/`. A instrução comum está em `base-instruction.md`.

## Canais do Buzz

Consulte `buzz-channels.md` para a organização sugerida dos canais e do fluxo de trabalho.

## Ativação

1. Configure as variáveis de `config.example.env` no ambiente seguro do Hermes.
2. Selecione no próprio Hermes o modelo/provedor que sua instalação já possui acesso.
3. Conecte o gateway do Buzz e defina a comunidade/relay.
4. Crie um perfil Hermes para cada agente e associe seu prompt correspondente.
5. Conceda acesso de leitura ao Google Ads e GA4.
6. Mantenha alterações de orçamento, anúncios e campanhas atrás do canal `#aprovacoes`.

## Integração local Hermes + Buzz

O Hermes ACP foi validado e o runtime personalizado do Buzz foi instalado em `C:\Users\thiag\Downloads\Buzz\custom_harnesses\hermes_uniao_farma.agent.json`. O Buzz mantém um redirecionamento compatível em sua pasta de dados, e o arquivo aponta para o executável local `hermes-acp.exe`. Nenhuma chave é copiada para o projeto.

Depois de reiniciar o Buzz, selecione **Hermes — União Farma** como harness ao criar um agente. A autenticação do relay continua sendo administrada pelo próprio Buzz Desktop; ela não é gravada neste repositório nem exposta ao terminal.

Nunca coloque chaves, tokens, arquivo `.env`, exportações de conversa ou dados de clientes neste repositório.
