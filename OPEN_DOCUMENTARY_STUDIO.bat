@echo off
setlocal
set "APP_DIR=%~dp0content-app"

if not exist "%APP_DIR%\start.bat" (
    echo Documentary Studio could not find content-app\start.bat.
    pause
    exit /b 1
)

if /I "%~1"=="--check" (
    echo Documentary Studio launcher is ready.
    exit /b 0
)

start "Documentary Studio" /D "%APP_DIR%" cmd.exe /k call start.bat
exit /b 0
