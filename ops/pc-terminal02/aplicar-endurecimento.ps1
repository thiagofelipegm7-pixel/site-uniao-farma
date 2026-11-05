#requires -Version 5.1
#requires -RunAsAdministrator
<#
  aplicar-endurecimento.ps1 - TERMINAL02 (PC da loja)

  O que faz (nada de segredo e nada do sync.ps1 original e alterado):
    1. Guarda copia de seguranca da tarefa e do sync.ps1 em C:\ProgramData\UniaoFarmaSync\backup-<data>.
    2. Cria o "sync-monitorado.ps1", que roda o sync.ps1 de sempre e:
         - confere o resultado de verdade (o sync.ps1 sempre sai com codigo 0, entao o Agendador nunca via falha);
         - tenta de novo ate 3 vezes (pausa de 90 s) se der ERRO;
         - se continuar falhando: grava em sync-erro.log, registra erro no Visualizador de Eventos
           (Windows Logs > Application, origem UniaoFarmaSync, ID 2000) e sai com codigo 1 (o Agendador tenta de novo);
         - quando da certo: grava a hora em ultimo-ok.txt.
    3. Reconfigura a tarefa UniaoFarma_Catalogo_Sync (mantem os horarios que ja existem):
         - executa o sync-monitorado.ps1 (mesma linha de comando oculta de antes);
         - roda com o usuario logado OU NAO (senha guardada pelo Windows), entao sobrevive a logoff e a reinicio;
         - "Executar assim que possivel se uma execucao agendada for perdida" (PC desligado na hora);
         - se falhar, tenta de novo a cada 10 min, 2 vezes; limite de 45 min por execucao; nao empilha execucoes;
         - roda mesmo no modo bateria.

  COMO USAR (uma vez, no TERMINAL02):
    1. Copie este arquivo para o PC (ex.: C:\Temp\aplicar-endurecimento.ps1).
    2. Abra o PowerShell COMO ADMINISTRADOR, com a sessao do MESMO usuario do Windows que ja roda a tarefa.
    3. Para so ver o estado atual, sem mudar nada:
         powershell -ExecutionPolicy Bypass -File C:\Temp\aplicar-endurecimento.ps1 -SoVerificar
    4. Para aplicar:
         powershell -ExecutionPolicy Bypass -File C:\Temp\aplicar-endurecimento.ps1
       O script pede a senha do Windows desse usuario (janela do Windows; ela nao aparece na tela nem e gravada em arquivo).

  VOLTAR ATRAS: o XML da tarefa antiga fica em backup-<data>\tarefa.xml (Agendador de Tarefas > Importar Tarefa).
#>
param(
    [string]$Tarefa = 'UniaoFarma_Catalogo_Sync',
    [switch]$SoVerificar
)

$ErrorActionPreference = 'Stop'
$Dir = 'C:\ProgramData\UniaoFarmaSync'
$Sync = Join-Path $Dir 'sync.ps1'
$Wrapper = Join-Path $Dir 'sync-monitorado.ps1'

function Titulo([string]$t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }

# ---------------------------------------------------------------- wrapper (conteudo do sync-monitorado.ps1)
$conteudoWrapper = @'
#requires -Version 5.1
# sync-monitorado.ps1 - roda o sync.ps1 e transforma ERRO em falha visivel (sync-erro.log, Visualizador de Eventos, codigo de saida 1).
$ErrorActionPreference = 'Continue'
$Dir     = 'C:\ProgramData\UniaoFarmaSync'
$Sync    = Join-Path $Dir 'sync.ps1'
$SyncLog = Join-Path $Dir 'sync.log'
$ErrLog  = Join-Path $Dir 'sync-erro.log'
$OkFile  = Join-Path $Dir 'ultimo-ok.txt'
$Tentativas = 3
$PausaSeg   = 90

function Agora { Get-Date -Format 'yyyy-MM-dd HH:mm:ss' }

function Gravar-Erro([string]$msg) {
    try {
        Add-Content -LiteralPath $ErrLog -Value ("{0} {1}" -f (Agora), $msg) -Encoding UTF8
        $todas = @(Get-Content -LiteralPath $ErrLog -Encoding UTF8)
        if ($todas.Count -gt 500) { $todas[($todas.Count - 500)..($todas.Count - 1)] | Set-Content -LiteralPath $ErrLog -Encoding UTF8 }
    } catch { }
}

function Evento([string]$tipo, [int]$id, [string]$msg) {
    try { Write-EventLog -LogName Application -Source 'UniaoFarmaSync' -EntryType $tipo -EventId $id -Message $msg } catch { }
}

# Roda o sync.ps1 uma vez e le a linha que ele acabou de gravar no sync.log.
function Rodar-Uma {
    $inicio = Agora
    $codigo = $null
    try {
        & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $Sync | Out-Null
        $codigo = $LASTEXITCODE
    } catch {
        return @{ Estado = 'ERRO'; Detalhe = ('nao consegui executar o sync.ps1: ' + $_.Exception.Message) }
    }
    $ultima = $null
    try { $ultima = Get-Content -LiteralPath $SyncLog -Tail 1 -Encoding UTF8 -ErrorAction Stop } catch { }
    if ($ultima -and ($ultima -match '^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (OK|ERRO|SKIP)\b\s*(.*)$')) {
        if ([string]::CompareOrdinal($Matches[1], $inicio) -ge 0) {
            $estado = $Matches[2]
            $detalhe = $Matches[3]
            if ($estado -eq 'SKIP' -and $detalhe -match 'vazia') { $estado = 'ERRO'; $detalhe = 'a consulta ao banco voltou vazia: ' + $detalhe }
            return @{ Estado = $estado; Detalhe = $detalhe }
        }
    }
    return @{ Estado = 'ERRO'; Detalhe = ("o sync.ps1 nao registrou resultado no sync.log (codigo de saida {0})" -f $codigo) }
}

$r = $null
for ($i = 1; $i -le $Tentativas; $i++) {
    $r = Rodar-Uma
    if ($r.Estado -ne 'ERRO') { break }
    Gravar-Erro ("tentativa {0} de {1} falhou: {2}" -f $i, $Tentativas, $r.Detalhe)
    if ($i -lt $Tentativas) { Start-Sleep -Seconds $PausaSeg }
}

if ($r.Estado -eq 'ERRO') {
    $msg = "Falha ao enviar o catalogo ao site depois de $Tentativas tentativas. Ultimo erro: $($r.Detalhe). Veja $ErrLog e $SyncLog."
    Gravar-Erro $msg
    Evento 'Error' 2000 $msg
    exit 1
}

if ($r.Estado -eq 'OK') {
    try { Set-Content -LiteralPath $OkFile -Value ("{0} {1}" -f (Agora), $r.Detalhe) -Encoding UTF8 } catch { }
}
exit 0
'@

# ---------------------------------------------------------------- 1. estado atual
Titulo "Estado atual da tarefa $Tarefa"
$task = Get-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
if (-not $task) { throw "Tarefa '$Tarefa' nao encontrada. Confira o nome em Agendador de Tarefas." }
$info = Get-ScheduledTaskInfo -TaskName $Tarefa -TaskPath $task.TaskPath
$usuario = $task.Principal.UserId
"Usuario da tarefa : $usuario"
"Tipo de logon     : $($task.Principal.LogonType)"
"Executa           : $($task.Actions[0].Execute) $($task.Actions[0].Arguments)"
"Gatilhos          : $(@($task.Triggers).Count)"
"Ultima execucao   : $($info.LastRunTime)  resultado: $($info.LastTaskResult)"
"Proxima execucao  : $($info.NextRunTime)"
"Perdida -> roda   : $($task.Settings.StartWhenAvailable)"
"Tentar de novo    : $($task.Settings.RestartCount) vez(es)"
if (Test-Path -LiteralPath (Join-Path $Dir 'sync.log')) {
    Write-Host 'Ultimas linhas do sync.log:'
    Get-Content -LiteralPath (Join-Path $Dir 'sync.log') -Tail 5 -Encoding UTF8 | ForEach-Object { "  $_" }
}
if ($SoVerificar) { Write-Host ''; Write-Host 'Modo -SoVerificar: nada foi alterado.' -ForegroundColor Yellow; return }

if (-not (Test-Path -LiteralPath $Sync)) { throw "Nao achei $Sync." }
if (-not $usuario -or $usuario -match '^(SYSTEM|NT AUTHORITY\\|SERVI|S-1-5-18)') {
    throw "A tarefa roda como '$usuario'. Os arquivos sql.sec/upload.sec so abrem para o usuario que os criou; rode este script de novo depois de ajustar a tarefa para esse usuario."
}

# ---------------------------------------------------------------- 2. senha (validada antes de gravar)
Titulo 'Senha do Windows'
$cred = Get-Credential -UserName $usuario -Message "Senha do Windows do usuario $usuario (a tarefa vai rodar com ou sem sessao aberta)"
if (-not $cred) { throw 'Cancelado.' }
$senha = $cred.GetNetworkCredential().Password
if ([string]::IsNullOrEmpty($senha)) { throw 'Senha vazia: o Windows nao deixa tarefas rodarem sem sessao com senha em branco. Defina uma senha para o usuario.' }

Add-Type -AssemblyName System.DirectoryServices.AccountManagement
$partes = $usuario -split '\\', 2
$dominio = if ($partes.Count -eq 2) { $partes[0] } else { $env:COMPUTERNAME }
$nomeCurto = if ($partes.Count -eq 2) { $partes[1] } else { $usuario }
$tipoCtx = if ($dominio -ieq $env:COMPUTERNAME -or $dominio -eq '.') { [System.DirectoryServices.AccountManagement.ContextType]::Machine } else { [System.DirectoryServices.AccountManagement.ContextType]::Domain }
$ctxNome = if ($tipoCtx -eq [System.DirectoryServices.AccountManagement.ContextType]::Machine) { $env:COMPUTERNAME } else { $dominio }
$ctx = New-Object System.DirectoryServices.AccountManagement.PrincipalContext($tipoCtx, $ctxNome)
if (-not $ctx.ValidateCredentials($nomeCurto, $senha)) { throw 'Senha nao confere. Nada foi alterado.' }
Write-Host 'Senha confere.'

# ---------------------------------------------------------------- 3. backup
Titulo 'Copia de seguranca'
$bk = Join-Path $Dir ('backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bk | Out-Null
Export-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath | Set-Content -LiteralPath (Join-Path $bk 'tarefa.xml') -Encoding Unicode
Copy-Item -LiteralPath $Sync -Destination (Join-Path $bk 'sync.ps1')
"Guardado em $bk"

# ---------------------------------------------------------------- 4. wrapper + Visualizador de Eventos
Titulo 'Instalando o sync-monitorado.ps1'
Set-Content -LiteralPath $Wrapper -Value $conteudoWrapper -Encoding UTF8
$erros = $null
$tokens = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($Wrapper, [ref]$tokens, [ref]$erros)
if ($erros -and $erros.Count -gt 0) { throw ('sync-monitorado.ps1 com erro de sintaxe: ' + $erros[0].Message) }
if (-not [System.Diagnostics.EventLog]::SourceExists('UniaoFarmaSync')) { New-EventLog -LogName Application -Source 'UniaoFarmaSync' }
"Criado: $Wrapper"

# ---------------------------------------------------------------- 5. tarefa
Titulo 'Reconfigurando a tarefa'
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $Wrapper + '"')
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10) -ExecutionTimeLimit (New-TimeSpan -Minutes 45) -MultipleInstances IgnoreNew
Set-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath -Action $acao -Settings $config | Out-Null
Set-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath -User $usuario -Password $senha | Out-Null
$senha = $null
$cred = $null

$nova = Get-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath
"Tipo de logon     : $($nova.Principal.LogonType)   (esperado: Password)"
"Executa           : $($nova.Actions[0].Execute) $($nova.Actions[0].Arguments)"
"Perdida -> roda   : $($nova.Settings.StartWhenAvailable)"
"Tentar de novo    : $($nova.Settings.RestartCount) vez(es) a cada $($nova.Settings.RestartInterval)"
"Gatilhos mantidos : $(@($nova.Triggers).Count)"
if ("$($nova.Principal.LogonType)" -ne 'Password') { Write-Warning 'O tipo de logon nao ficou como Password. Abra a tarefa no Agendador e marque "Executar estando o usuario conectado ou nao".' }

# ---------------------------------------------------------------- 6. teste
Titulo 'Teste'
$r = Read-Host 'Executar a tarefa agora para testar? (S/N)'
if ($r -match '^[sSyY]') {
    Start-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath
    Write-Host 'Aguardando ate 3 minutos...'
    for ($i = 0; $i -lt 36; $i++) {
        Start-Sleep -Seconds 5
        if ((Get-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath).State -ne 'Running') { break }
    }
    $info = Get-ScheduledTaskInfo -TaskName $Tarefa -TaskPath $task.TaskPath
    "Resultado da tarefa: $($info.LastTaskResult)  (0 = deu certo)"
    Get-Content -LiteralPath (Join-Path $Dir 'sync.log') -Tail 3 -Encoding UTF8 | ForEach-Object { "  $_" }
    if (Test-Path -LiteralPath (Join-Path $Dir 'ultimo-ok.txt')) { 'ultimo-ok.txt: ' + (Get-Content -LiteralPath (Join-Path $Dir 'ultimo-ok.txt') -Raw -Encoding UTF8) }
}
Write-Host ''
Write-Host 'Pronto. Daqui para frente, falhas aparecem em sync-erro.log e no Visualizador de Eventos (Application, UniaoFarmaSync).' -ForegroundColor Green
