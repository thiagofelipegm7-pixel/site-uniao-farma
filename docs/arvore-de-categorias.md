# Árvore de categorias

Plano de finalização, item 2 ("Excelente categorização"): no máximo 3 níveis, **departamento › categoria › subcategoria**.

- **Departamento** (nível 1): os 7 de sempre (Medicamentos, Dermocosméticos, Perfumes, Infantil e Gestante, Beleza, Cuidado Diário, Bem Estar).
- **Categoria** (nível 2, "Tipo de produto" no filtro): ex. Desodorantes, Fraldas, Protetores solares. Vem das regras em
  `app/nacoes-unidas/produtos/arvore-categorias.json`.
- **Subcategoria** (nível 3): a estrutura aceita, mas ainda não há regras. Entra quando o volume de produtos de uma categoria pedir.

## Como funciona

O motor lê o nome do produto (sem acento, maiúsculas) e aplica as regras do departamento, da primeira para a última; a primeira que casa vence.
O que nenhuma regra pega fica em **Outros** (aparece por último no filtro). A sincronização refaz isso a cada publicação.

## Cobertura em 08/11/2026 (produtos que caíram numa categoria)

| Departamento | Cobertura |
|---|---|
| Dermocosméticos | 98% |
| Beleza | 97% |
| Perfumes | 100% |
| Infantil e Gestante | 90% |
| Cuidado Diário | 85% |
| Bem Estar | 83% |
| Medicamentos | sem regras ainda (precisa da classe terapêutica, que o nome do sistema não traz) |

## Como corrigir uma categoria

1. Abra `app/nacoes-unidas/produtos/arvore-categorias.json`.
2. Ache a regra da categoria certa (cada uma tem um `padrao`, expressão regular aplicada ao nome em maiúsculas e sem acento) e acrescente a palavra
   (`...|PALAVRA NOVA`). A ordem importa: uma regra mais acima vence uma mais abaixo.
3. Rode `npm test`: o teste confere que o site e o gerador da busca classificam igual e que pelo menos 70% caem numa categoria.

Produto em departamento errado (por exemplo, esmalte em Cuidado Diário) continua sendo corrigido na fila de revisão de categoria (`/interno/revisao`), não aqui.
