# ============================================================
#  Buenos Dias - configurar despertador + horarios
#  6:45  -> la PC se despierta y queda despierta 20 min
#  6:46  -> (Claude, en la nube) refresca contexto/proyectos-en-curso.md
#  6:50  -> corre el reporte general (tarea "BuenosDias")
#
#  Ejecutar UNA vez en PowerShell COMO ADMINISTRADOR:
#    cd "<carpeta-del-proyecto>"
#    powershell -ExecutionPolicy Bypass -File .\configurar-despertador.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$carpeta = $PSScriptRoot
if (-not $carpeta) { $carpeta = (Get-Item -Path ".").FullName }
$usuario = "$env:USERDOMAIN\$env:USERNAME"

# 1) Habilitar temporizadores de activacion (enchufado y bateria)
powercfg /SETACVALUEINDEX SCHEME_CURRENT SUB_SLEEP RTCWAKE 1
powercfg /SETDCVALUEINDEX SCHEME_CURRENT SUB_SLEEP RTCWAKE 1
powercfg /SETACTIVE SCHEME_CURRENT
Write-Host "[ok] Temporizadores de activacion habilitados"

# 2) Script que mantiene la PC despierta 20 minutos (si no, Windows
#    la vuelve a dormir a los ~2 min cuando se despierta sola)
$mantener = Join-Path $carpeta "mantener-despierta.ps1"
@'
Add-Type -Name P -Namespace W -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
[W.P]::SetThreadExecutionState(0x80000003) | Out-Null
Start-Sleep -Seconds 1200
[W.P]::SetThreadExecutionState(0x80000000) | Out-Null
'@ | Set-Content -Path $mantener -Encoding UTF8
Write-Host "[ok] Creado $mantener"

$settings = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
$principal = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive

# 3) Tarea "BuenosDias-Despertar" a las 6:45
$accionDesp = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$mantener`""
Register-ScheduledTask -TaskName "BuenosDias-Despertar" -Force `
  -Trigger (New-ScheduledTaskTrigger -Daily -At "06:45") `
  -Action $accionDesp -Settings $settings -Principal $principal | Out-Null
Write-Host "[ok] Tarea BuenosDias-Despertar -> 06:45 (despierta la PC)"

# 4) Tarea "BuenosDias" a las 6:50 (se conserva la accion si ya existe)
$existente = Get-ScheduledTask -TaskName "BuenosDias" -ErrorAction SilentlyContinue
if ($existente) {
  $accionRep = $existente.Actions
  Write-Host "[..] BuenosDias ya existia, conservo su accion"
} else {
  $node = (Get-Command node).Source
  $accionRep = New-ScheduledTaskAction -Execute $node -Argument "index.js" -WorkingDirectory $carpeta
  Write-Host "[..] BuenosDias no existia, la creo con: $node index.js"
}
Register-ScheduledTask -TaskName "BuenosDias" -Force `
  -Trigger (New-ScheduledTaskTrigger -Daily -At "06:50") `
  -Action $accionRep -Settings $settings -Principal $principal | Out-Null
Write-Host "[ok] Tarea BuenosDias -> 06:50 (reporte general)"

# 5) Verificacion
Write-Host "`n--- Estado ---"
Get-ScheduledTask -TaskName "BuenosDias*" | ForEach-Object {
  $i = $_ | Get-ScheduledTaskInfo
  "{0,-22} proxima: {1}   despierta PC: {2}" -f $_.TaskName, $i.NextRunTime, $_.Settings.WakeToRun
}
Write-Host "`nTemporizadores que pueden despertar la PC:"
powercfg /waketimers
