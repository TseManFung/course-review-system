@echo off
setlocal ENABLEEXTENSIONS
cd /d "%~dp0"

echo =============================================
echo Course Review System - Prod Starter
echo =============================================

REM ---- Check Node.js ----
where node >nul 2>nul || goto :nonode
where npm >nul 2>nul || goto :nonpm

call :startService backend "npm start"
call :startService frontend "npm run build && npm run prod"

goto :done

:startService
REM %1 = folder, %2 = command (quoted)
if not exist "%~1" (
  echo [WARN] %~1 folder not found
  goto :eof
)
echo [INFO] Starting %~1 ...
start "%~1" cmd /k "cd %~1 && %~2"
goto :eof

:nonode
echo [ERROR] Node.js not found in PATH.
pause
exit /b 1

:nonpm
echo [ERROR] npm not found in PATH.
pause
exit /b 1

:done
echo.
echo If both folders existed they were launched in separate windows.
echo Close those windows to stop each service.
echo.
pause
exit /b 0