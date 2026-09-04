. "$PSScriptRoot\common.ps1"

$repoRoot = Get-RepoRoot
Ensure-RootEnv -RepoRoot $repoRoot

$backendDir = Join-Path $repoRoot 'services\backend-api'
$aiDir = Join-Path $repoRoot 'services\ai-service'
$backendPython = Join-Path $backendDir '.venv\Scripts\python.exe'
$aiPython = Join-Path $aiDir '.venv\Scripts\python.exe'

if (-not (Test-Path $backendPython) -or -not (Test-Path $aiPython) -or -not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
  throw "Moi truong local chua san sang. Hay chay 'npm run setup:local' truoc."
}

if (-not (Test-PortListening -Port 5000)) {
  $backendCommand = @"
Set-Location '$backendDir'
& '$backendPython' -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
"@
  Start-ServiceWindow -Title 'Road Damage GIS Backend API' -WorkingDirectory $backendDir -Command $backendCommand
} else {
  Write-Host 'Backend API da dang chay tai cong 5000.' -ForegroundColor Yellow
}

if (-not (Test-PortListening -Port 8001)) {
  $aiCommand = @"
Set-Location '$aiDir'
& '$aiPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
"@
  Start-ServiceWindow -Title 'Road Damage GIS AI Service' -WorkingDirectory $aiDir -Command $aiCommand
} else {
  Write-Host 'AI Service da dang chay tai cong 8001.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Da khoi dong backend + AI services.' -ForegroundColor Cyan
Write-Host 'Backend health: http://localhost:5000/health'
Write-Host 'AI health:      http://localhost:8001/health'
