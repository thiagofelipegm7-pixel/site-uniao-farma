# Importar a planilha do fornecedor

1. Salve a planilha como **CSV** (Excel: Salvar como → CSV). Precisa de uma coluna de **código de barras** (EAN/GTIN) e uma de **descrição**. Opcional: coluna **fonte** (link https por linha).
2. Simule (não grava nada):
   `node --experimental-strip-types --import ./tests/ts-resolve-hook.mjs ops/importar-planilha/importar.mjs planilha.csv --fonte https://site-do-fornecedor.com.br`
3. Leia o relatório (aceitas × recusadas e o motivo). Para gravar, repita com `--aplicar`, rode `npm test` e publique por PR.

Regras (as mesmas do teste do site): só produto que existe no catálogo; sem medicamento e sem NBCAL/fórmula infantil (decisão do responsável técnico); texto de 20 a 600 caracteres sem promessa de efeito ("cura", "trata", "48 horas", "clinicamente comprovado"...); fonte https obrigatória. Entra com confiança "média". Quem já tem texto pesquisado é preservado, a menos que use `--substituir`.
