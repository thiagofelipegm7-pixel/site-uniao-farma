# Decisões: Camadas 1 e 2 de informações corretas

**Data:** 8 de novembro de 2026

## Camada 1 — Entrada automática

O sync segura para revisão (não publica) quando:
- Preço zero
- Preço variou mais de **20%** de uma vez
- Nome vazio
- Produto sem categoria

## Camada 2 — Regras legais

- Preço acima do teto da CMED (PMC): **bloqueia a publicação**, mas permite override manual com registro.
- Enquadramento (sem receita / com receita / controlado): **só publica se estiver confirmado**.
