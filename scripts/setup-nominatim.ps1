param(
  [ValidateSet('up', 'down', 'status', 'logs', 'test', 'restart')]
  [string]$Action = 'up'
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir '..')).Path
$composeFile = Join-Path $repoRoot 'docker-compose.nominatim.yml'

if (-not (Test-Path $composeFile)) {
  Write-Error "Khong tim thay file cau hinh Docker Compose: $composeFile"
  exit 1
}

# Kiem tra Docker CLI
$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
  Write-Error "Docker chua duoc cai dat hoac chua duoc them vao PATH. Vui long cai dat Docker Desktop."
  exit 1
}

# Kiem tra Docker Daemon
$serverVersion = & docker info --format '{{.ServerVersion}}' 2>$null
if ($LASTEXITCODE -ne 0 -or -not $serverVersion) {
  Write-Error "Docker daemon chua duoc khoi dong. Vui long bat Docker Desktop truoc khi tiep tuc."
  exit 1
}

switch ($Action) {
  'up' {
    Write-Host ">>> Dang khoi dong container Nominatim OSM Vietnam..." -ForegroundColor Cyan
    docker compose -f $composeFile up -d

    Write-Host ""
    Write-Host "[THONG TIN QUAN TRONG]" -ForegroundColor Yellow
    Write-Host "- Lan chay dau tien se tu dong tai 'vietnam-latest.osm.pbf' va import vao PostgreSQL."
    Write-Host "- Thoi gian import lan dau thuong mat tu 10 - 25 phut tuy cau hinh may va toc do mang."
    Write-Host "- Cac lan chay tiep theo se khoi dong ngay lap tuc vi du lieu da duoc luu trong volume 'nominatim-data'."
    Write-Host ""
    Write-Host "De theo doi tien trinh import, chay lenh:" -ForegroundColor Green
    Write-Host "  .\scripts\setup-nominatim.ps1 logs" -ForegroundColor White
    Write-Host "De kiem tra trang thai sau khi import xong:" -ForegroundColor Green
    Write-Host "  .\scripts\setup-nominatim.ps1 status" -ForegroundColor White
    Write-Host "De kiem tra do tre endpoint (AC-02):" -ForegroundColor Green
    Write-Host "  .\scripts\setup-nominatim.ps1 test" -ForegroundColor White
  }

  'down' {
    Write-Host ">>> Dang dung container Nominatim..." -ForegroundColor Yellow
    docker compose -f $composeFile down
    Write-Host "Da dung container thanh cong." -ForegroundColor Green
  }

  'restart' {
    Write-Host ">>> Dang khoi dong lai container Nominatim..." -ForegroundColor Cyan
    docker compose -f $composeFile restart
    Write-Host "Da khoi dong lai container." -ForegroundColor Green
  }

  'logs' {
    Write-Host ">>> Dang xem log truc tiep tu rdg-nominatim (Nhan Ctrl+C de thoat)..." -ForegroundColor Cyan
    docker compose -f $composeFile logs -f nominatim
  }

  'status' {
    Write-Host ">>> Trang thai container Nominatim:" -ForegroundColor Cyan
    docker compose -f $composeFile ps

    Write-Host ""
    Write-Host ">>> Kiem tra ket noi den http://localhost:8080..." -ForegroundColor Cyan
    try {
      $resp = Invoke-WebRequest -Uri "http://localhost:8080/status.php" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
      Write-Host "Nominatim dang hoat dong binh thuong (HTTP $($resp.StatusCode))." -ForegroundColor Green
    } catch {
      Write-Host "Luu y: Endpoint http://localhost:8080 chua san sang (co the container dang trong qua trinh tai/import du lieu OSM)." -ForegroundColor Yellow
      Write-Host "Chi tiet loi: $($_.Exception.Message)" -ForegroundColor Gray
    }
  }

  'test' {
    Write-Host ">>> Kiem tra endpoint reverse geocoding (AC-02)..." -ForegroundColor Cyan
    $testUrl = "http://localhost:8080/reverse?format=json&lat=10.782345&lon=106.699876&addressdetails=1&accept-language=vi"
    Write-Host "URL: $testUrl"

    try {
      $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
      $resp = Invoke-RestMethod -Uri $testUrl -TimeoutSec 5 -ErrorAction Stop
      $stopwatch.Stop()
      $elapsedMs = [math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2)

      Write-Host ""
      Write-Host "[KET QUA TEST THANH CONG]" -ForegroundColor Green
      Write-Host "  - Thoi gian phan hoi: $elapsedMs ms" -ForegroundColor $(if ($elapsedMs -lt 20) { 'Green' } else { 'Yellow' })
      Write-Host "  - Ten dia diem: $($resp.display_name)"
      Write-Host "  - Duong: $($resp.address.road)"
      Write-Host "  - Quan/Huyen: $($resp.address.city_district -or $resp.address.suburb -or $resp.address.district)"
      Write-Host "  - Tinh/TP: $($resp.address.city -or $resp.address.state)"

      if ($elapsedMs -lt 20) {
        Write-Host ">>> Dat tieu chi AC-02 (< 20ms)!" -ForegroundColor Green
      } else {
        Write-Host ">>> Chu y: Thoi gian $elapsedMs ms (mong doi < 20ms trong moi truong production san sang)." -ForegroundColor Yellow
      }
    } catch {
      Write-Host ""
      Write-Host "[LOI] Khong the ket noi den local Nominatim: $($_.Exception.Message)" -ForegroundColor Red
      Write-Host "Neu container vua duoc tao, hay kiem tra tien trinh import bang: .\scripts\setup-nominatim.ps1 logs" -ForegroundColor Yellow
    }
  }
}
