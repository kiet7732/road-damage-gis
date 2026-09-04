. "$PSScriptRoot\common.ps1"

$repoRoot = Get-RepoRoot
Ensure-RootEnv -RepoRoot $repoRoot

$backendDir = Join-Path $repoRoot 'services\backend-api'
$aiDir = Join-Path $repoRoot 'services\ai-service'

if (-not (Test-Path (Join-Path $repoRoot 'node_modules'))) {
  Write-Host 'Dang cai dat goi Node.js tai root repo...' -ForegroundColor Cyan
  Push-Location $repoRoot
  try {
    npm install
  } finally {
    Pop-Location
  }
}

$pythonLauncher = Get-PythonLauncher

function Initialize-ServiceVenv {
  param(
    [string]$ServiceDir
  )

  $venvDir = Join-Path $ServiceDir '.venv'
  $requirementsFile = Join-Path $ServiceDir 'requirements.txt'

  if (-not (Test-Path $venvDir)) {
    Write-Host "Dang tao virtual environment cho $ServiceDir ..." -ForegroundColor Cyan
    & $pythonLauncher.FilePath @($pythonLauncher.Arguments + @('-m', 'venv', $venvDir))
  }

  $servicePython = Join-Path $venvDir 'Scripts\python.exe'
  Write-Host "Dang cai dat dependencies cho $ServiceDir ..." -ForegroundColor Cyan
  & $servicePython -m pip install --upgrade pip
  & $servicePython -m pip install -r $requirementsFile
}

Initialize-ServiceVenv -ServiceDir $backendDir
Initialize-ServiceVenv -ServiceDir $aiDir

Write-Host ''
Write-Host 'Setup local hoan tat.' -ForegroundColor Green
Write-Host 'Buoc tiep theo: npm run dev:all' -ForegroundColor Yellow
