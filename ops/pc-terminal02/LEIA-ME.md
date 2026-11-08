# PC da loja (TERMINAL02) — sync quase em tempo real

## O que roda
- `sync.ps1` a **cada 5 minutos** (padrao do `aplicar-tempo-real.ps1`; antes eram 10) (tarefa `UniaoFarma_Catalogo_Sync`):
  - sem mudança de preço/estoque → `POST /heartbeat` (poucos bytes; o monitor sabe que o PC está vivo);
  - com mudança → `POST /delta` só com itens alterados/novos e códigos que saíram;
  - **não há** upload completo agendado (nem de madrugada).
- Upload completo **só manual**, se houver deriva ou primeiro setup:
  `powershell -NoProfile -ExecutionPolicy Bypass -File C:\ProgramData\UniaoFarmaSync\sync.ps1 -Completo`

## Instalar / atualizar (uma vez, Admin)
1. Copie esta pasta `ops/pc-terminal02/` para o PC (ex.: `C:\Temp\pc-terminal02`).
2. Se ainda não rodou o endurecimento (falha visível + tarefa com senha):  
   `powershell -ExecutionPolicy Bypass -File C:\Temp\pc-terminal02\aplicar-endurecimento.ps1`
3. Instale o ritmo de 5 min + o sync novo (`-Minutos N` muda o intervalo; de 2 a 30):  
   `powershell -ExecutionPolicy Bypass -File C:\Temp\pc-terminal02\aplicar-tempo-real.ps1`  
   (pede a senha do Windows do mesmo usuário dos arquivos `sql.sec` / `upload.sec`)
4. Só conferir, sem mudar: acrescente `-SoVerificar`.

## Logs
- `C:\ProgramData\UniaoFarmaSync\sync.log` — uma linha por ciclo (`BATIMENTO`, `DELTA`, `COMPLETO`, `ERRO`)
- `sync-erro.log` + Visualizador de Eventos (se o wrapper `sync-monitorado.ps1` estiver ativo)
