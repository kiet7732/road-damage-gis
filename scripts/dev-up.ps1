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

if (-not (Test-PortListening -Port 5173)) {
  $webAdminCommand = @"
Set-Location '$repoRoot'
npm run dev:web-admin
"@
  Start-ServiceWindow -Title 'Road Damage GIS Web Admin' -WorkingDirectory $repoRoot -Command $webAdminCommand
} else {
  Write-Host 'Web Admin da dang chay tai cong 5173.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host 'Dang khoi dong app nguoi phan anh tai cong 8081...' -ForegroundColor Cyan
Write-Host 'Backend health: http://localhost:5000/health'
Write-Host 'AI health:      http://localhost:8001/health'
Write-Host 'Reporter web:   http://localhost:8081'
Write-Host 'Web admin:      http://localhost:5173'
Write-Host ''

Push-Location $repoRoot
try {
  npm run dev:web
} finally {
  Pop-Location
}
