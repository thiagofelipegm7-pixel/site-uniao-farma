#requires -Version 5.1
<#
  sync.ps1 - TERMINAL02 -> Cloudflare Worker dmaster-catalogo (tempo quase real)

  A cada execucao (tarefa a cada 10 min):
    1) Le dbo.View_Padrao (somente leitura).
    2) Compara preco/estoque (e nome/classe) com o ultimo snapshot local.
    3) Sem mudanca -> POST /heartbeat (JSON minimo; o monitor sabe que o PC esta vivo).
    4) Com mudanca -> POST /delta so com itens novos/alterados e codigos removidos.
    5) -Completo (manual) -> POST /upload com a lista inteira (bootstrap / correcao de deriva).
       NAO ha upload completo agendado: o site ja tem copia; so delta + batimento.

  Segredos DPAPI: C:\ProgramData\UniaoFarmaSync\sql.sec e upload.sec (mesmo usuario da tarefa).
  Log: sync.log (200 linhas). Com o wrapper sync-monitorado.ps1, ERRO vira codigo de saida 1.
#>
param(
    [switch]$Completo
)

$ErrorActionPreference = 'Stop'
$ProgressPreference    = 'SilentlyContinue'

$Dir         = 'C:\ProgramData\UniaoFarmaSync'
$SqlSecFile  = Join-Path $Dir 'sql.sec'
$TokSecFile  = Join-Path $Dir 'upload.sec'
$LogFile     = Join-Path $Dir 'sync.log'
$SnapFile    = Join-Path $Dir 'ultimo-snapshot.json'
$HashFile    = Join-Path $Dir 'ultimo-hash.txt'
$Loja        = 'itacolomi'
$BaseUrl     = 'https://dmaster-catalogo.thiagofelipegm7.workers.dev'
$ConnBase    = 'Server=SERVER,1666;Database=MCDados;User ID=user_Padrao;Connect Timeout=15'
$Query       = 'SELECT * FROM dbo.View_Padrao'

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$rows = 0
$status = 'ERRO'
$detail = ''
$sqlPlain = $null
$tokPlain = $null

function Get-PlainFromDpapi([string]$path) {
    $enc = (Get-Content -LiteralPath $path -Raw).Trim()
    $secure = ConvertTo-SecureString -String $enc
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Write-SyncLog([string]$line) {
    try {
        if (-not (Test-Path -LiteralPath $Dir)) { New-Item -ItemType Directory -Force -Path $Dir | Out-Null }
        $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        Add-Content -LiteralPath $LogFile -Value "$stamp $line" -Encoding UTF8
        $all = @(Get-Content -LiteralPath $LogFile -Encoding UTF8)
        if ($all.Count -gt 200) { $all[($all.Count - 200)..($all.Count - 1)] | Set-Content -LiteralPath $LogFile -Encoding UTF8 }
    } catch { }
}

function J($v) {
    if ($null -eq $v) { return 'null' }
    $b = $v
    if ($b -is [System.Management.Automation.PSObject]) { $b = $b.BaseObject }
    if ($b -is [double] -or $b -is [int] -or $b -is [long] -or $b -is [int16] -or $b -is [byte] -or $b -is [decimal]) {
        return ([double]$b).ToString([Globalization.CultureInfo]::InvariantCulture)
    }
    if ($b -is [bool]) { if ($b) { return 'true' } else { return 'false' } }
    $t = [string]$b
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append('"')
    foreach ($ch in $t.ToCharArray()) {
        $c = [int]$ch
        if ($ch -eq '"') { [void]$sb.Append('\"') }
        elseif ($ch -eq '\') { [void]$sb.Append('\\') }
        elseif ($c -lt 32) { [void]$sb.Append(('\u{0:x4}' -f $c)) }
        else { [void]$sb.Append($ch) }
    }
    [void]$sb.Append('"')
    return $sb.ToString()
}

function Fingerprint([object]$row) {
    $cod = [string]$row['CodigoDeBarras']
    $preco = $row['Pvenda']
    $est = $row['Estoque']
    $prod = [string]$row['Produto']
    $cls = [string]$row['Classe']
    return ($cod + '|' + $preco + '|' + $est + '|' + $prod + '|' + $cls)
}

function Post-Json([string]$url, [byte[]]$body, [string]$token, [bool]$gzipped) {
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    $headers = @{ Authorization = "Bearer $token" }
    if ($gzipped) { $headers['Content-Encoding'] = 'gzip' }
    return Invoke-WebRequest -Uri $url -Method Post -Body $body -UseBasicParsing -TimeoutSec 120 `
        -UserAgent 'UniaoFarmaSync/2.0' -ContentType 'application/json' -Headers $headers
}

function To-Gzip([byte[]]$jsonBytes) {
    $ms = New-Object System.IO.MemoryStream
    $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress, $true)
    $gz.Write($jsonBytes, 0, $jsonBytes.Length)
    $gz.Dispose()
    $out = $ms.ToArray()
    $ms.Dispose()
    return $out
}

$mutex = New-Object System.Threading.Mutex($false, 'Global\UniaoFarmaSyncCatalogo')
$haveLock = $false
try {
    $haveLock = $mutex.WaitOne(0)
    if (-not $haveLock) { $status = 'SKIP'; $detail = 'outra execucao em andamento'; exit 0 }

    $sqlPlain = Get-PlainFromDpapi $SqlSecFile
    $tokPlain = Get-PlainFromDpapi $TokSecFile

    $items = New-Object 'System.Collections.Generic.List[object]'
    $conn = New-Object System.Data.SqlClient.SqlConnection ($ConnBase + ';Password=' + $sqlPlain)
    try {
        $conn.Open()
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = $Query
        $cmd.CommandTimeout = 120
        $rd = $cmd.ExecuteReader()
        try {
            $names = for ($i = 0; $i -lt $rd.FieldCount; $i++) { $rd.GetName($i) }
            while ($rd.Read()) {
                $row = New-Object 'System.Collections.Generic.Dictionary[string,object]'
                for ($i = 0; $i -lt $names.Count; $i++) {
                    $v = $rd.GetValue($i)
                    if ($v -is [System.DBNull]) { $v = $null }
                    elseif ($v -is [string]) { $v = $v.Trim() }
                    elseif ($v -is [decimal]) { $v = [double]$v }
                    elseif ($v -is [single]) { $v = [double]$v }
                    elseif ($v -is [datetime]) { $v = $v.ToString('s') }
                    elseif ($v -is [byte[]]) { $v = $null }
                    if ($null -ne $v) { $v = $v.PSObject.BaseObject }
                    $row[$names[$i]] = $v
                }
                [void]$items.Add($row)
            }
        } finally { $rd.Close() }
    } finally { $conn.Dispose() }
    $rows = $items.Count
    if ($rows -eq 0) { $status = 'SKIP'; $detail = 'view vazia, nada enviado'; throw [System.OperationCanceledException]::new('empty') }

    # Hash estavel: ordena por codigo + fingerprint
    $fps = New-Object 'System.Collections.Generic.List[string]'
    $byCode = @{}
    foreach ($it in $items) {
        $cod = [string]$it['CodigoDeBarras']
        $fp = Fingerprint $it
        [void]$fps.Add($fp)
        if ($cod) { $byCode[$cod] = $it }
    }
    $sorted = $fps | Sort-Object
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hashBytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes([string]::Join("`n", $sorted)))
    $sha.Dispose()
    $hash = ([BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()

    $hashAntigo = $null
    if (Test-Path -LiteralPath $HashFile) { $hashAntigo = (Get-Content -LiteralPath $HashFile -Raw -ErrorAction SilentlyContinue).Trim() }

    $precisaCompleto = $Completo -or -not (Test-Path -LiteralPath $SnapFile) -or -not $hashAntigo
    $geradoEm = (Get-Date).ToString('s')

    if (-not $precisaCompleto -and $hash -eq $hashAntigo) {
        $body = [System.Text.Encoding]::UTF8.GetBytes(('{"loja":' + (J $Loja) + '}'))
        $resp = Post-Json ($BaseUrl + '/heartbeat') $body $tokPlain $false
        $status = 'OK'
        $detail = "BATIMENTO HTTP $([int]$resp.StatusCode)"
    }
    elseif ($precisaCompleto) {
        $out = New-Object System.Text.StringBuilder
        [void]$out.Append('{"loja":' + (J $Loja) + ',"geradoEm":' + (J $geradoEm) + ',"itens":[')
        $first = $true
        foreach ($it in $items) {
            if (-not $first) { [void]$out.Append(',') }
            $first = $false
            [void]$out.Append('{')
            $k1 = $true
            foreach ($k in $it.Keys) {
                if (-not $k1) { [void]$out.Append(',') }
                $k1 = $false
                [void]$out.Append((J $k) + ':' + (J $it[$k]))
            }
            [void]$out.Append('}')
        }
        [void]$out.Append(']}')
        $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($out.ToString())
        $gz = To-Gzip $jsonBytes
        $resp = Post-Json ($BaseUrl + '/upload') $gz $tokPlain $true
        Set-Content -LiteralPath $SnapFile -Value $out.ToString() -Encoding UTF8
        Set-Content -LiteralPath $HashFile -Value $hash -Encoding ASCII
        $status = 'OK'
        $detail = "COMPLETO HTTP $([int]$resp.StatusCode) itens=$rows enviado=$([math]::Round($gz.Length/1KB))KB"
    }
    else {
        $snap = $null
        try { $snap = Get-Content -LiteralPath $SnapFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch { $snap = $null }
        if (-not $snap -or -not $snap.itens) {
            # Snapshot ilegivel: um completo pontual (manual-equivalente) para nao perder o fio
            $precisaCompleto = $true
            throw [System.InvalidOperationException]::new('snapshot_ilegivel_refazer_completo')
        }
        $antigos = @{}
        foreach ($it in $snap.itens) {
            $cod = [string]$it.CodigoDeBarras
            if ($cod) { $antigos[$cod] = $it }
        }
        $mudancas = New-Object 'System.Collections.Generic.List[object]'
        foreach ($it in $items) {
            $cod = [string]$it['CodigoDeBarras']
            if (-not $cod) { continue }
            $fpNovo = Fingerprint $it
            if (-not $antigos.ContainsKey($cod)) { [void]$mudancas.Add($it); continue }
            $a = $antigos[$cod]
            # ConvertFrom-Json vira PSCustomObject
            $fpAnt = ([string]$a.CodigoDeBarras) + '|' + $a.Pvenda + '|' + $a.Estoque + '|' + ([string]$a.Produto) + '|' + ([string]$a.Classe)
            if ($fpNovo -ne $fpAnt) { [void]$mudancas.Add($it) }
        }
        $removidos = New-Object 'System.Collections.Generic.List[string]'
        foreach ($cod in $antigos.Keys) {
            if (-not $byCode.ContainsKey($cod)) { [void]$removidos.Add($cod) }
        }

        $out = New-Object System.Text.StringBuilder
        [void]$out.Append('{"loja":' + (J $Loja) + ',"geradoEm":' + (J $geradoEm) + ',"mudancas":[')
        $first = $true
        foreach ($it in $mudancas) {
            if (-not $first) { [void]$out.Append(',') }
            $first = $false
            [void]$out.Append('{')
            $k1 = $true
            foreach ($k in $it.Keys) {
                if (-not $k1) { [void]$out.Append(',') }
                $k1 = $false
                [void]$out.Append((J $k) + ':' + (J $it[$k]))
            }
            [void]$out.Append('}')
        }
        [void]$out.Append('],"removidos":[')
        $first = $true
        foreach ($c in $removidos) {
            if (-not $first) { [void]$out.Append(',') }
            $first = $false
            [void]$out.Append((J $c))
        }
        [void]$out.Append(']}')
        $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($out.ToString())
        $usarGzip = $jsonBytes.Length -gt 8192
        $body = if ($usarGzip) { To-Gzip $jsonBytes } else { $jsonBytes }
        $resp = Post-Json ($BaseUrl + '/delta') $body $tokPlain $usarGzip

        # Atualiza snapshot local com a lista completa atual (para o proximo diff)
        $full = New-Object System.Text.StringBuilder
        [void]$full.Append('{"loja":' + (J $Loja) + ',"geradoEm":' + (J $geradoEm) + ',"itens":[')
        $first = $true
        foreach ($it in $items) {
            if (-not $first) { [void]$full.Append(',') }
            $first = $false
            [void]$full.Append('{')
            $k1 = $true
            foreach ($k in $it.Keys) {
                if (-not $k1) { [void]$full.Append(',') }
                $k1 = $false
                [void]$full.Append((J $k) + ':' + (J $it[$k]))
            }
            [void]$full.Append('}')
        }
        [void]$full.Append(']}')
        Set-Content -LiteralPath $SnapFile -Value $full.ToString() -Encoding UTF8
        Set-Content -LiteralPath $HashFile -Value $hash -Encoding ASCII
        $status = 'OK'
        $detail = "DELTA HTTP $([int]$resp.StatusCode) mudancas=$($mudancas.Count) removidos=$($removidos.Count) enviado=$([math]::Round($body.Length/1KB))KB"
    }
}
catch [System.OperationCanceledException] {
    # view vazia
}
catch {
    if ($_.Exception.Message -eq 'snapshot_ilegivel_refazer_completo') {
        # reentra no fluxo completo uma vez
        try {
            $out = New-Object System.Text.StringBuilder
            [void]$out.Append('{"loja":' + (J $Loja) + ',"geradoEm":' + (J ((Get-Date).ToString('s'))) + ',"itens":[')
            $first = $true
            foreach ($it in $items) {
                if (-not $first) { [void]$out.Append(',') }
                $first = $false
                [void]$out.Append('{')
                $k1 = $true
                foreach ($k in $it.Keys) {
                    if (-not $k1) { [void]$out.Append(',') }
                    $k1 = $false
                    [void]$out.Append((J $k) + ':' + (J $it[$k]))
                }
                [void]$out.Append('}')
            }
            [void]$out.Append(']}')
            $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($out.ToString())
            $gz = To-Gzip $jsonBytes
            $resp = Post-Json ($BaseUrl + '/upload') $gz $tokPlain $true
            Set-Content -LiteralPath $SnapFile -Value $out.ToString() -Encoding UTF8
            Set-Content -LiteralPath $HashFile -Value $hash -Encoding ASCII
            $status = 'OK'
            $detail = "COMPLETO(recuperacao) HTTP $([int]$resp.StatusCode) itens=$rows"
        } catch {
            $msg = ($_.Exception.Message -replace '[\r\n]+', ' ')
            if ($sqlPlain) { $msg = $msg.Replace($sqlPlain, '***') }
            if ($tokPlain) { $msg = $msg.Replace($tokPlain, '***') }
            $status = 'ERRO'
            $detail = $msg
            if ($detail.Length -gt 300) { $detail = $detail.Substring(0, 300) }
        }
    } else {
        $msg = ($_.Exception.Message -replace '[\r\n]+', ' ')
        if ($sqlPlain) { $msg = $msg.Replace($sqlPlain, '***') }
        if ($tokPlain) { $msg = $msg.Replace($tokPlain, '***') }
        $status = 'ERRO'
        $detail = $msg
        if ($detail.Length -gt 300) { $detail = $detail.Substring(0, 300) }
    }
}
finally {
    $sqlPlain = $null; $tokPlain = $null
    Write-SyncLog ("{0} linhas={1} {2}ms {3}" -f $status, $rows, $sw.ElapsedMilliseconds, $detail)
    if ($haveLock) { try { $mutex.ReleaseMutex() } catch { } }
    $mutex.Dispose()
}
exit 0
