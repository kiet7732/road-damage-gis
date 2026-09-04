. "$PSScriptRoot\common.ps1"

$repoRoot = Get-RepoRoot
Ensure-RootEnv -RepoRoot $repoRoot

$aiDir = Join-Path $repoRoot 'services\ai-service'
$python = Get-ServicePythonExecutable -ServiceDir $aiDir

Push-Location $aiDir
try {
  & $python.FilePath @($python.Arguments + @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8001', '--reload'))
} finally {
  Pop-Location
}
