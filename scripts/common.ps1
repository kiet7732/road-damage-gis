Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
}

function Ensure-RootEnv {
  param(
    [string]$RepoRoot
  )

  $envFile = Join-Path $RepoRoot '.env'
  $envExample = Join-Path $RepoRoot '.env.example'

  if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
      throw "Khong tim thay file .env.example tai $envExample"
    }

    Copy-Item $envExample $envFile
    Write-Host "Da tao file .env tu .env.example" -ForegroundColor Green
  }
}

function Get-PythonLauncher {
  $pyCommand = Get-Command py -ErrorAction SilentlyContinue
  if ($pyCommand) {
    return @{
      FilePath = $pyCommand.Source
      Arguments = @('-3')
    }
  }

  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand) {
    return @{
      FilePath = $pythonCommand.Source
      Arguments = @()
    }
  }

  throw 'Khong tim thay Python. Hay cai Python 3 truoc khi chay he thong.'
}

function Get-ServicePythonExecutable {
  param(
    [string]$ServiceDir
  )

  $venvPython = Join-Path $ServiceDir '.venv\Scripts\python.exe'
  if (Test-Path $venvPython) {
    return @{
      FilePath = $venvPython
      Arguments = @()
    }
  }

  return Get-PythonLauncher
}

function Test-PortListening {
  param(
    [int]$Port
  )

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return $null -ne $connection
  } catch {
    return $false
  }
}

function Start-ServiceWindow {
  param(
    [string]$Title,
    [string]$WorkingDirectory,
    [string]$Command
  )

  $shellCommand = Get-Command pwsh -ErrorAction SilentlyContinue
  $shell = if ($shellCommand) { $shellCommand.Source } else { 'powershell.exe' }

  $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
  Start-Process -FilePath $shell -WorkingDirectory $WorkingDirectory -ArgumentList @(
    '-NoExit',
    '-EncodedCommand',
    $encodedCommand
  ) | Out-Null

  Write-Host "Da mo cua so: $Title" -ForegroundColor Green
}

function Get-EnvMap {
  param(
    [string]$EnvFilePath
  )

  $map = @{}

  if (-not (Test-Path $EnvFilePath)) {
    return $map
  }

  foreach ($line in Get-Content $EnvFilePath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) {
      continue
    }

    $parts = $trimmed.Split('=', 2)
    if ($parts.Count -ne 2) {
      continue
    }

    $map[$parts[0].Trim()] = $parts[1].Trim()
  }

  return $map
}
