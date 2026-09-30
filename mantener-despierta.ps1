Add-Type -Name P -Namespace W -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
# ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
[W.P]::SetThreadExecutionState(0x80000003) | Out-Null
Start-Sleep -Seconds 1200
[W.P]::SetThreadExecutionState(0x80000000) | Out-Null
