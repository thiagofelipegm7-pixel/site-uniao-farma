# PC da loja (TERMINAL02): endurecer o envio do catálogo

`aplicar-endurecimento.ps1` deixa a tarefa `UniaoFarma_Catalogo_Sync` à prova de reinício/logoff e faz as falhas aparecerem.
**Rodar uma vez**, como Administrador, no TERMINAL02, com o mesmo usuário do Windows que já roda a tarefa
(os arquivos `sql.sec` e `upload.sec` só abrem para esse usuário). As instruções completas estão no cabeçalho do script.

- `-SoVerificar` só mostra o estado atual (usuário, tipo de logon, gatilhos, última execução), sem mudar nada.
- Sem parâmetros: faz backup (`backup-<data>\tarefa.xml` e `sync.ps1`), cria `sync-monitorado.ps1`, reconfigura a tarefa e oferece um teste.
- O `sync.ps1` original **não é alterado**. O `sync-monitorado.ps1` o executa, confere a linha que ele grava no `sync.log` e, se for `ERRO`
  (ou não gravar nada), tenta de novo até 3 vezes; se persistir grava `sync-erro.log`, um evento de erro no Visualizador de Eventos
  (Application, origem `UniaoFarmaSync`, ID 2000) e sai com código 1, para o Agendador tentar de novo.
- Sucesso: `ultimo-ok.txt` com a hora.
- A senha do Windows é pedida numa janela do Windows e usada só para registrar a tarefa (não é gravada em arquivo, não passa pelo repositório).
- O script só tem caracteres ASCII de propósito (PowerShell 5.1 lê UTF-8 sem BOM como ANSI).
