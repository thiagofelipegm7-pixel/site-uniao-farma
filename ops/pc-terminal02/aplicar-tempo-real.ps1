#requires -Version 5.1
#requires -RunAsAdministrator
<#
  aplicar-tempo-real.ps1 - TERMINAL02

  Instala o sync.ps1 de tempo quase real (delta + batimento a cada 10 min) e
  reconfigura a tarefa UniaoFarma_Catalogo_Sync:
    - gatilho: a cada 10 minutos, o dia todo (leve: sem mudanca so manda heartbeat ~100 bytes)
    - mantem "rodar com ou sem sessao", StartWhenAvailable, reinicio em falha
  NAO agenda upload completo diario. Completo so manual:
      powershell -File C:\ProgramData\UniaoFarmaSync\sync.ps1 -Completo

  Uso (Admin, mesmo usuario DPAPI):
    powershell -ExecutionPolicy Bypass -File C:\Temp\aplicar-tempo-real.ps1
    powershell -ExecutionPolicy Bypass -File C:\Temp\aplicar-tempo-real.ps1 -SoVerificar
#>
param(
    [string]$Tarefa = 'UniaoFarma_Catalogo_Sync',
    [switch]$SoVerificar
)

$ErrorActionPreference = 'Stop'
$Dir = 'C:\ProgramData\UniaoFarmaSync'
$SyncDest = Join-Path $Dir 'sync.ps1'
$Wrapper = Join-Path $Dir 'sync-monitorado.ps1'
$Aqui = Split-Path -Parent $MyInvocation.MyCommand.Path
$SyncSrc = Join-Path $Aqui 'sync.ps1'

function Titulo([string]$t) { Write-Host ''; Write-Host "== $t" -ForegroundColor Cyan }

Titulo "Estado atual: $Tarefa"
$task = Get-ScheduledTask -TaskName $Tarefa -ErrorAction SilentlyContinue
if (-not $task) { throw "Tarefa '$Tarefa' nao encontrada." }
$info = Get-ScheduledTaskInfo -TaskName $Tarefa -TaskPath $task.TaskPath
$usuario = $task.Principal.UserId
"Usuario : $usuario  Logon: $($task.Principal.LogonType)"
"Acao    : $($task.Actions[0].Execute) $($task.Actions[0].Arguments)"
"Gatilhos: $(@($task.Triggers).Count)  Proxima: $($info.NextRunTime)"
if (Test-Path (Join-Path $Dir 'sync.log')) {
    Write-Host 'Ultimas linhas sync.log:'
    Get-Content (Join-Path $Dir 'sync.log') -Tail 5 -Encoding UTF8 | ForEach-Object { "  $_" }
}
if ($SoVerificar) { Write-Host 'Modo -SoVerificar: nada alterado.' -ForegroundColor Yellow; return }

if (-not (Test-Path -LiteralPath $SyncSrc)) { throw "Nao achei sync.ps1 em $SyncSrc (copie a pasta ops/pc-terminal02 inteira)." }
if (-not $usuario -or $usuario -match '^(SYSTEM|NT AUTHORITY\\|SERVI|S-1-5-18)') {
    throw "A tarefa roda como '$usuario'; sql.sec/upload.sec so abrem para o usuario que os criou."
}

Titulo 'Senha do Windows'
$cred = Get-Credential -UserName $usuario -Message "Senha do Windows de $usuario (tarefa com ou sem sessao)"
if (-not $cred) { throw 'Cancelado.' }
$senha = $cred.GetNetworkCredential().Password
if ([string]::IsNullOrEmpty($senha)) { throw 'Senha vazia.' }
Add-Type -AssemblyName System.DirectoryServices.AccountManagement
$partes = $usuario -split '\\', 2
$dominio = if ($partes.Count -eq 2) { $partes[0] } else { $env:COMPUTERNAME }
$nomeCurto = if ($partes.Count -eq 2) { $partes[1] } else { $usuario }
$tipoCtx = if ($dominio -ieq $env:COMPUTERNAME -or $dominio -eq '.') { [System.DirectoryServices.AccountManagement.ContextType]::Machine } else { [System.DirectoryServices.AccountManagement.ContextType]::Domain }
$ctxNome = if ($tipoCtx -eq [System.DirectoryServices.AccountManagement.ContextType]::Machine) { $env:COMPUTERNAME } else { $dominio }
$ctx = New-Object System.DirectoryServices.AccountManagement.PrincipalContext($tipoCtx, $ctxNome)
if (-not $ctx.ValidateCredentials($nomeCurto, $senha)) { throw 'Senha nao confere. Nada alterado.' }

Titulo 'Backup + sync.ps1 novo'
$bk = Join-Path $Dir ('backup-tempo-real-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $bk | Out-Null
Export-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath | Set-Content (Join-Path $bk 'tarefa.xml') -Encoding Unicode
if (Test-Path $SyncDest) { Copy-Item $SyncDest (Join-Path $bk 'sync.ps1') }
Copy-Item -LiteralPath $SyncSrc -Destination $SyncDest -Force
"sync.ps1 instalado em $SyncDest"

# Garante o wrapper de falhas (se ainda nao existe, cria um minimo)
if (-not (Test-Path $Wrapper)) {
    Write-Warning "sync-monitorado.ps1 ausente: rode antes aplicar-endurecimento.ps1, ou a tarefa chamara sync.ps1 direto."
}

Titulo 'Tarefa a cada 10 minutos'
$alvo = if (Test-Path $Wrapper) { $Wrapper } else { $SyncDest }
$acao = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $alvo + '"')
# Repeticao infinita a cada 10 min, a partir de agora
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes( ([math]::Ceiling((Get-Date).TimeOfDay.TotalMinutes / 10) * 10) )
$trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 10) -RepetitionDuration ([TimeSpan]::MaxValue)).Repetition
$config = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 5) -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -MultipleInstances IgnoreNew
Set-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath -Action $acao -Trigger $trigger -Settings $config | Out-Null
Set-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath -User $usuario -Password $senha | Out-Null
$senha = $null; $cred = $null

$nova = Get-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath
"Logon   : $($nova.Principal.LogonType)"
"Acao    : $($nova.Actions[0].Arguments)"
"Gatilhos: $(@($nova.Triggers).Count)"

Titulo 'Primeiro ciclo (completo automatico se nao houver snapshot)'
$r = Read-Host 'Rodar a tarefa agora? (S/N)'
if ($r -match '^[sSyY]') {
    Start-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath
    Write-Host 'Aguardando ate 3 min...'
    for ($i = 0; $i -lt 36; $i++) {
        Start-Sleep -Seconds 5
        if ((Get-ScheduledTask -TaskName $Tarefa -TaskPath $task.TaskPath).State -ne 'Running') { break }
    }
    Get-Content (Join-Path $Dir 'sync.log') -Tail 3 -Encoding UTF8 | ForEach-Object { "  $_" }
}
Write-Host ''
Write-Host 'Pronto. A cada 10 min: delta se mudou preco/estoque, senao so batimento. Completo manual: sync.ps1 -Completo' -ForegroundColor Green
