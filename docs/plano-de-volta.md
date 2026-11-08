# Plano de volta — voltar à versão anterior em minutos

**Data:** 8 de novembro de 2026  
**Plataforma:** Cloudflare Pages / Workers

## Atalho (mais rápido)

1. Acesse o painel do Cloudflare → Workers & Pages → projeto do site.
2. Vá em **Deployments**.
3. Encontre o deploy anterior estável.
4. Clique nos três pontos → **Rollback to this deployment** (ou equivalente).
5. Confirme. O tráfego volta para essa versão em segundos/minutos.

## Procedimento manual (se o atalho não estiver disponível)

1. No GitHub, identifique o commit estável anterior (`git log` ou na interface).
2. Crie um branch de rollback a partir desse commit:
   ```bash
   git checkout -b rollback-YYYYMMDD <commit-sha>
   ```
3. Faça push e abra um PR (ou force o deploy se o fluxo permitir).
4. Ou, via Wrangler (se configurado):
   ```bash
   wrangler pages deployment list --project-name=<nome-do-projeto>
   wrangler pages deployment rollback <deployment-id>
   ```

## Checklist antes de voltar

- [ ] Anotar o que quebrou e em qual versão
- [ ] Confirmar que o deploy anterior está saudável
- [ ] Avisar a equipe (WhatsApp interno) que houve rollback
- [ ] Depois do rollback, abrir issue/PR com a correção

## Tempo esperado

- Atalho pelo painel: **menos de 2 minutos**
- Procedimento manual: **5–10 minutos**
