. "$PSScriptRoot\common.ps1"

$repoRoot = Get-RepoRoot
Ensure-RootEnv -RepoRoot $repoRoot

$envMap = Get-EnvMap -EnvFilePath (Join-Path $repoRoot '.env')

$backendApiUrl = if ($envMap.ContainsKey('BACKEND_API_URL')) { $envMap['BACKEND_API_URL'] } else { 'http://localhost:5000/api' }
$expoApiUrl = if ($envMap.ContainsKey('EXPO_PUBLIC_API_URL')) { $envMap['EXPO_PUBLIC_API_URL'] } else { '' }
$viteApiUrl = if ($envMap.ContainsKey('VITE_API_URL')) { $envMap['VITE_API_URL'] } else { '' }
$backendBaseUrl = ($backendApiUrl -replace '/api/?$','')
$aiBaseUrl = if ($envMap.ContainsKey('AI_SERVICE_URL')) { $envMap['AI_SERVICE_URL'] } else { 'http://localhost:8001' }
$webUrl = 'http://localhost:8081'

function Invoke-JsonCheck {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
    return @{
      ok = $true
      name = $Name
      url = $Url
      data = $response
    }
  } catch {
    return @{
      ok = $false
      name = $Name
      url = $Url
      error = $_.Exception.Message
    }
  }
}

function Invoke-HttpCheck {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 10
    return @{
      ok = $true
      name = $Name
      url = $Url
      statusCode = [int]$response.StatusCode
    }
  } catch {
    $statusCode = $null
    $exception = $_.Exception
    $responseProperty = $exception.PSObject.Properties['Response']
    if ($null -ne $responseProperty) {
      $response = $responseProperty.Value
      if ($null -ne $response) {
        $statusCodeProperty = $response.PSObject.Properties['StatusCode']
        if ($null -ne $statusCodeProperty -and $statusCodeProperty.Value) {
          $statusCode = [int]$statusCodeProperty.Value
        }
      }
    }

    return @{
      ok = $false
      name = $Name
      url = $Url
      statusCode = $statusCode
      error = $_.Exception.Message
    }
  }
}

$results = @()
$results += Invoke-JsonCheck -Name 'Backend health' -Url "$backendBaseUrl/health"
$results += Invoke-JsonCheck -Name 'Backend readiness' -Url "$backendBaseUrl/ready"
$results += Invoke-JsonCheck -Name 'AI health' -Url "$aiBaseUrl/health"
$results += Invoke-JsonCheck -Name 'AI readiness' -Url "$aiBaseUrl/ready"
$results += Invoke-HttpCheck -Name 'Frontend web' -Url $webUrl

$frontendEnvAligned = ($expoApiUrl -eq $backendApiUrl) -and ($viteApiUrl -eq $backendApiUrl)

Write-Host ''
Write-Host '=== ROAD DAMAGE GIS READINESS CHECK ===' -ForegroundColor Cyan
Write-Host "Frontend web: $webUrl"
Write-Host "Backend API:  $backendApiUrl"
Write-Host "AI service:   $aiBaseUrl"
Write-Host ''

foreach ($result in $results) {
  if ($result.ok) {
    Write-Host "[PASS] $($result.name) -> $($result.url)" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] $($result.name) -> $($result.url)" -ForegroundColor Red
    if ($result.error) {
      Write-Host "       $($result.error)" -ForegroundColor DarkYellow
    }
  }
}

if ($frontendEnvAligned) {
  Write-Host "[PASS] Frontend env -> EXPO_PUBLIC_API_URL va VITE_API_URL trung voi BACKEND_API_URL" -ForegroundColor Green
} else {
  Write-Host "[FAIL] Frontend env -> EXPO_PUBLIC_API_URL hoac VITE_API_URL dang lech BACKEND_API_URL" -ForegroundColor Red
  Write-Host "       EXPO_PUBLIC_API_URL = $expoApiUrl" -ForegroundColor DarkYellow
  Write-Host "       VITE_API_URL        = $viteApiUrl" -ForegroundColor DarkYellow
  Write-Host "       BACKEND_API_URL     = $backendApiUrl" -ForegroundColor DarkYellow
}

$backendReadyResult = $results | Where-Object { $_.name -eq 'Backend readiness' } | Select-Object -First 1
$aiReadyResult = $results | Where-Object { $_.name -eq 'AI readiness' } | Select-Object -First 1
$frontendResult = $results | Where-Object { $_.name -eq 'Frontend web' } | Select-Object -First 1

$systemReady = $frontendEnvAligned -and $backendReadyResult.ok -and $aiReadyResult.ok -and $frontendResult.ok

Write-Host ''
if ($systemReady) {
  Write-Host 'He thong da SAN SANG de test local.' -ForegroundColor Green
  exit 0
}

Write-Host 'He thong CHUA san sang de test local. Hay xem cac muc FAIL ben tren.' -ForegroundColor Red
exit 1
