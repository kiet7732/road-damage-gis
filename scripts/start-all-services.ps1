. "$PSScriptRoot\common.ps1"

$repoRoot = Get-RepoRoot
Ensure-RootEnv -RepoRoot $repoRoot

$backendDir = Join-Path $repoRoot 'services\backend-api'
$aiDir = Join-Path $repoRoot 'services\ai-service'
$backendPython = (Get-ServicePythonExecutable -ServiceDir $backendDir).FilePath
$aiPython = (Get-ServicePythonExecutable -ServiceDir $aiDir).FilePath

if (-not (Test-PortListening -Port 5000)) {
  $backendCmd = "Set-Location '$backendDir'; & '$backendPython' -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload"
  Start-ServiceWindow -Title 'Backend API' -WorkingDirectory $backendDir -Command $backendCmd
}

if (-not (Test-PortListening -Port 8001)) {
  $aiCmd = "Set-Location '$aiDir'; & '$aiPython' -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
  Start-ServiceWindow -Title 'AI Service' -WorkingDirectory $aiDir -Command $aiCmd
}

if (-not (Test-PortListening -Port 5173)) {
  $webCmd = "Set-Location '$repoRoot'; npx vite preview --config apps/web-admin/vite.config.ts --host 0.0.0.0 --port 5173"
  Start-ServiceWindow -Title 'Web Admin' -WorkingDirectory $repoRoot -Command $webCmd
}

Write-Host "All persistent services started successfully." -ForegroundColor Green
