# Emergency Rollback PowerShell Script for Road Damage GIS
# Ticket RDG-PG-08: Emergency Rollback to SQLite in < 3 minutes
[CmdletBinding()]
param(
    [switch]$NoRestoreBackup
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $RepoRoot "services\backend-api"

Write-Host ">>> Khởi chạy Rollback khẩn cấp về SQLite (SLA < 3 phút)..." -ForegroundColor Yellow

$ArgsList = @("scripts/rollback_to_sqlite.py")
if ($NoRestoreBackup) { $ArgsList += "--no-restore-backup" }

Push-Location $BackendDir
try {
    python @ArgsList
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Quy trình rollback thất bại với mã lỗi $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
