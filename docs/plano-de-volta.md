# Plano de volta — voltar à versão anterior em minutos

**Data:** 8 de novembro de 2026  
**Plataforma:** Cloudflare Workers (o site publica pelo Workers Builds a cada mudança aprovada no GitHub)

## Atalho (mais rápido)

1. Acesse o painel do Cloudflare → Workers & Pages → **site-uniao-farma**.
2. Abra a aba **Deployments** (versões).
3. Encontre a versão anterior estável (a última que funcionava bem).
4. Nos três pontos dessa versão, escolha **Rollback** (voltar para esta versão) e confirme.
5. O tráfego volta para essa versão em segundos. Os arquivos de dados do estoque também voltam junto: depois da volta, a sincronização do PC traz o estoque de novo na próxima rodada.

## Procedimento manual (se o atalho não estiver disponível)

1. No GitHub, identifique o commit estável anterior (`git log` ou na interface).
2. Crie um branch de rollback a partir desse commit:
   ```bash
   git checkout -b rollback-YYYYMMDD <commit-sha>
   ```
3. Faça push e abra um PR (ou force o deploy se o fluxo permitir).
4. Ou, via Wrangler (precisa de login no Cloudflare):
   ```bash
   npx wrangler deployments list --name site-uniao-farma
   npx wrangler rollback <version-id> --name site-uniao-farma
   ```
5. Atenção: o Workers Builds publica de novo a cada commit na `main`. Para a volta valer, reverta o commit ruim na `main` (`git revert <sha>` e merge) logo depois, senão a próxima publicação traz o problema de volta.

## Checklist antes de voltar

- [ ] Anotar o que quebrou e em qual versão
- [ ] Confirmar que o deploy anterior está saudável
- [ ] Avisar a equipe (WhatsApp interno) que houve rollback
- [ ] Depois do rollback, abrir issue/PR com a correção

## Tempo esperado

- Atalho pelo painel: **menos de 2 minutos**
- Procedimento manual: **5–10 minutos**
