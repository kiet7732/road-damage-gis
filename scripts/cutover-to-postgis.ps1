# Cutover PowerShell Script for Road Damage GIS
# Ticket RDG-PG-08: Zero-Downtime Database Cutover to PostgreSQL 16 + PostGIS
[CmdletBinding()]
param(
    [switch]$SkipSmokeTests,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $RepoRoot "services\backend-api"

Write-Host ">>> Khởi chạy Cutover sang PostgreSQL 16 + PostGIS..." -ForegroundColor Cyan

$ArgsList = @("scripts/cutover_to_postgis.py")
if ($SkipSmokeTests) { $ArgsList += "--skip-smoke-tests" }
if ($DryRun) { $ArgsList += "--dry-run" }

Push-Location $BackendDir
try {
    python @ArgsList
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Quy trình cắt chuyển thất bại với mã lỗi $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
