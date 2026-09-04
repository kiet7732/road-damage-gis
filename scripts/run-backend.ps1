. "$PSScriptRoot\common.ps1"

$repoRoot = Get-RepoRoot
Ensure-RootEnv -RepoRoot $repoRoot

$backendDir = Join-Path $repoRoot 'services\backend-api'
$python = Get-ServicePythonExecutable -ServiceDir $backendDir

Push-Location $backendDir
try {
  & $python.FilePath @($python.Arguments + @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '5000', '--reload'))
} finally {
  Pop-Location
}
