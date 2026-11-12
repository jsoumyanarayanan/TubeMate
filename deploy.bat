@echo off
rem TubeMate start and deploy menu for Windows.
rem Double-click this file, or run it from a terminal in the project folder.
setlocal EnableExtensions
title TubeMate
cd /d "%~dp0"
if not defined PORT set "PORT=3000"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org and run this file again.
  pause
  exit /b 1
)

:menu
cls
echo ==========================================
echo   TubeMate  (port %PORT%)
echo ==========================================
echo   1  Install dependencies and create .env.local
echo   2  Start development server
echo   3  Build and start production server
echo   4  Build only
echo   5  Stop whatever is running on port %PORT%
echo   6  Commit and push to GitHub
echo   0  Exit
echo.
set "choice="
set /p "choice=Choose an option: "

if "%choice%"=="1" goto install
if "%choice%"=="2" goto dev
if "%choice%"=="3" goto prod
if "%choice%"=="4" goto build
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto push
if "%choice%"=="0" goto end
goto menu

:install
if not exist ".env.local" (
  > ".env.local" echo NEXT_PUBLIC_SITE_URL=http://localhost:%PORT%
  echo Created .env.local
)
echo Installing dependencies...
if exist "package-lock.json" (call npm ci) else (call npm install)
if errorlevel 1 goto failed
echo Done.
pause
goto menu

:ensure
if not exist "node_modules" (
  echo node_modules not found. Installing first...
  if exist "package-lock.json" (call npm ci) else (call npm install)
  if errorlevel 1 exit /b 1
)
exit /b 0

:dev
call :ensure
if errorlevel 1 goto failed
echo Development server on http://localhost:%PORT%  (Ctrl+C to stop)
call npx next dev -p %PORT%
pause
goto menu

:prod
call :ensure
if errorlevel 1 goto failed
echo Building production bundle...
call npm run build
if errorlevel 1 goto failed
echo Production server on http://localhost:%PORT%  (Ctrl+C to stop)
call npx next start -p %PORT%
pause
goto menu

:build
call :ensure
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo Build finished.
pause
goto menu

:stop
set "found="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
  set "found=1"
  taskkill /PID %%p /F
)
if not defined found echo Nothing is listening on port %PORT%.
pause
goto menu

:push
where git >nul 2>&1
if errorlevel 1 (
  echo Git is not installed.
  pause
  goto menu
)
if not exist ".git" (
  echo This folder is not a git repository. Clone TubeMate from GitHub first.
  pause
  goto menu
)
set "msg="
set /p "msg=Commit message (Enter for a default): "
if "%msg%"=="" set "msg=Update TubeMate"
git add -A
git commit -m "%msg%"
git push
pause
goto menu

:failed
echo.
echo Something went wrong. Read the messages above, then try again.
pause
goto menu

:end
endlocal
exit /b 0
