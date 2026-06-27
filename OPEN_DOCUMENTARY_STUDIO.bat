@echo off
setlocal
set "APP_DIR=%~dp0content-app"
set "CLOUDFLARED_DIR=C:\Program Files (x86)\cloudflared"

if exist "%CLOUDFLARED_DIR%\cloudflared.exe" (
    set "PATH=%CLOUDFLARED_DIR%;%PATH%"
)

if not exist "%APP_DIR%\start.bat" (
    echo Documentary Studio could not find content-app\start.bat.
    pause
    exit /b 1
)

if /I "%~1"=="--check" (
    where cloudflared >nul 2>nul
    if errorlevel 1 (
        echo Documentary Studio launcher cannot find cloudflared.
        exit /b 2
    )
    echo Documentary Studio launcher is ready.
    exit /b 0
)

start "Documentary Studio" /D "%APP_DIR%" cmd.exe /k call start.bat
exit /b 0
