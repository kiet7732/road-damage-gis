@echo off
setlocal EnableExtensions

rem Road Damage GIS - local real run launcher
rem Chay tu thu muc root cua repo

cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] Khong tim thay package.json o thu muc root repo.
  echo Hay copy file .bat nay vao dung thu muc root: D:\DATN\Code\road-damage-gis
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Khong tim thay npm trong PATH.
  echo Hay cai dat Node.js/npm truoc khi chay file nay.
  pause
  exit /b 1
)

:MENU
cls
echo ===============================================
echo   Road Damage GIS - Local Real Run Launcher
echo ===============================================
echo.
echo 1^) Setup local environment
echo 2^) Seed demo data ^(reporter + admin^)
echo 3^) Start full system ^(khong seed^)
echo 4^) Start full system + full seed ^(reporter + admin + engineer^)
echo 5^) Start mobile Expo ^(LAN QR: 192.168.1.54^)
echo 6^) Start mobile Expo TUNNEL ^(Vuot tuong lua / WiFi bi chan^)
echo 7^) Start reporter web ^(8081^)
echo 8^) Start web admin ^(5173^)
echo 9^) Check readiness
echo 0^) Exit
echo.
choice /c 1234567890 /n /m "Chon chuc nang: "
set "SEL=%errorlevel%"

if "%SEL%"=="1" goto SETUP
if "%SEL%"=="2" goto SEED
if "%SEL%"=="3" goto START
if "%SEL%"=="4" goto ALL
if "%SEL%"=="5" goto MOBILE
if "%SEL%"=="6" goto TUNNEL
if "%SEL%"=="7" goto WEB
if "%SEL%"=="8" goto WEBADMIN
if "%SEL%"=="9" goto CHECK
if "%SEL%"=="10" goto END
goto MENU

:SETUP
echo.
echo [INFO] Dang chuan bi moi truong local...
call npm run setup:local
echo.
pause
goto MENU

:SEED
echo.
echo [INFO] Dang seed du lieu demo...
call npm run data:seed
if errorlevel 1 goto FAIL
echo.
pause
goto MENU

:START
echo.
echo [INFO] Dang khoi dong full system khong seed...
echo [INFO] Neu day la lan dau, hay chay "Setup local environment" truoc.
start "Road Damage GIS - Full System" cmd /k "cd /d ""%~dp0"" && npm run dev:all"
echo.
echo [INFO] Da yeu cau mo cac service:
echo        - Backend API:  http://localhost:5000/health
echo        - AI Service:   http://localhost:8001/health
echo        - Web admin:    http://localhost:5173
echo        - Reporter web: http://localhost:8081
echo        - Mobile Expo:  quet QR trong cua so Expo (LAN: 192.168.1.54)
echo.
pause
goto MENU

:CHECK
echo.
echo [INFO] Dang kiem tra readiness tong he thong...
call npm run check:ready
echo.
pause
goto MENU

:MOBILE
echo.
echo [INFO] Dang mo Expo mobile (LAN) de quet QR...
start "Road Damage GIS - Mobile Expo (LAN)" cmd /k "cd /d ""%~dp0"" && npx expo start -c"
echo.
pause
goto MENU

:TUNNEL
echo.
echo [INFO] Dang mo Expo mobile (TUNNEL - Vuot firewall/AP isolation) de quet QR...
start "Road Damage GIS - Mobile Expo (Tunnel)" cmd /k "cd /d ""%~dp0"" && npx expo start --tunnel -c"
echo.
pause
goto MENU

:WEB
echo.
echo [INFO] Dang mo web nguoi phan anh tai cong 8081...
start "Road Damage GIS - Reporter Web" cmd /k "cd /d ""%~dp0"" && npm run dev:web"
echo.
pause
goto MENU

:WEBADMIN
echo.
echo [INFO] Dang mo web admin tai cong 5173...
start "Road Damage GIS - Web Admin" cmd /k "cd /d ""%~dp0"" && npm run dev:web-admin"
echo.
pause
goto MENU

:ALL
echo.
echo [INFO] Buoc 1/3: Seed demo data (reporter + admin)...
call npm run data:seed
if errorlevel 1 goto FAIL

echo.
echo [INFO] Buoc 2/3: Seed tai khoan ky su demo...
call npm run data:seed:engineer
if errorlevel 1 goto FAIL

echo.
echo [INFO] Buoc 3/3: Start full system...
start "Road Damage GIS - Full System" cmd /k "cd /d ""%~dp0"" && npm run dev:all"
echo.
echo [INFO] Da yeu cau mo toan bo he thong:
echo        - Backend API:  http://localhost:5000/health
echo        - AI Service:   http://localhost:8001/health
echo        - Web admin:    http://localhost:5173
echo        - Reporter web: http://localhost:8081
echo        - Mobile Expo:  quet QR trong cua so Expo
echo        - Tai khoan demo: admin, reporter1, reporter2, engineer.a, engineer.b
echo.
goto END

:FAIL
echo.
echo [ERROR] Co loi xay ra trong qua trinh chay.
pause
goto MENU

:END
endlocal
