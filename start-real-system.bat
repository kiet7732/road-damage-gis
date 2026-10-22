@echo off
setlocal EnableExtensions

rem ===========================================================================
rem Road Damage GIS - Local Real Run Launcher
rem Chay tu thu muc root cua repo: D:\DATN\Code\road-damage-gis
rem ===========================================================================

cd /d "%~dp0"

if not exist "package.json" (
  echo [ERROR] Khong tim thay package.json o thu muc root repo.
  echo Hay chay file .bat nay tu thu muc root: D:\DATN\Code\road-damage-gis
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
echo ===================================================================
echo     ROAD DAMAGE GIS - TRINH DIEU HANH HE THONG (REAL LAUNCHER)
echo ===================================================================
echo.
echo   1) Mo tat ca he thong (Khong seed du lieu)
echo   2) Mo tat ca he thong (Co seed du lieu demo day du)
echo   0) Thoat
echo.
echo ===================================================================
echo.

choice /c 120 /n /m "Chon chuc nang [1, 2, 0]: "
set "SEL=%errorlevel%"

if "%SEL%"=="1" goto START_NO_SEED
if "%SEL%"=="2" goto START_WITH_SEED
if "%SEL%"=="3" goto END
goto MENU

:START_NO_SEED
echo.
echo ===================================================================
echo   DANG KHOI DONG TOAN BO HE THONG (KHONG SEED DU LIEU)...
echo ===================================================================
start "Road Damage GIS - Full System" cmd /k "cd /d ""%~dp0"" && npm run dev:all"
echo.
echo [OK] Da khoi dong cac dich vu thanh cong:
echo      - Backend API:  http://localhost:5000/ready
echo      - AI Service:   http://localhost:8001/health
echo      - Web Admin:    http://localhost:5173
echo      - Reporter Web: http://localhost:8081
echo.
pause
goto MENU

:START_WITH_SEED
echo.
echo ===================================================================
echo   DANG SEED DU LIEU VA KHOI DONG TOAN BO HE THONG...
echo ===================================================================
echo.
echo [1/3] Seed du lieu co ban (Reporter + Admin)...
call npm run data:seed
if errorlevel 1 goto FAIL

echo.
echo [2/3] Seed tai khoan ky su hien truong...
call npm run data:seed:engineer
if errorlevel 1 goto FAIL

echo.
echo [3/3] Khoi dong cac dich vu...
start "Road Damage GIS - Full System" cmd /k "cd /d ""%~dp0"" && npm run dev:all"
echo.
echo [OK] Da seed du lieu va mo toan bo he thong thanh cong!
echo      - Backend API:  http://localhost:5000/ready
echo      - AI Service:   http://localhost:8001/health
echo      - Web Admin:    http://localhost:5173
echo      - Reporter Web: http://localhost:8081
echo.
echo      - Tai khoan demo:
echo          * Admin:    admin.demo@roadgis.local / Admin@123
echo          * Reporter: reporter1.demo@roadgis.local / Reporter@123
echo          * Engineer: engineer.a.demo@roadgis.local / Engineer@123
echo.
pause
goto MENU

:FAIL
echo.
echo [ERROR] Co loi xay ra trong qua trinh thuc thi.
pause
goto MENU

:END
endlocal
