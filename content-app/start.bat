@echo off
chcp 65001 >nul
title Documentary Studio - One-Click Setup
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         Documentary Studio - One-Click Setup             ║
echo  ║         Auto-installs everything you need                ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

REM Preserve known tool locations because elevated launchers may inherit a stale PATH.
set "PATH=%SystemRoot%\System32;%SystemRoot%;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\Ollama;%APPDATA%\npm;%LOCALAPPDATA%\Microsoft\WindowsApps;%PATH%"

REM ─── Step 1: Check Node.js ─────────────────────────────────
echo  [1/7] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo       Node.js not found. Installing via winget...
    echo       ^(this may take 1-2 minutes, please wait^)
    winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -h
    if errorlevel 1 (
        echo.
        echo  [ERROR] Could not install Node.js automatically.
        echo          Please install manually from https://nodejs.org
        echo          Then run this script again.
        pause
        exit /b 1
    )
    REM Refresh PATH
    call :refreshenv
)
echo       Node.js OK: 
node --version
echo.

REM ─── Step 2: Check pnpm ────────────────────────────────────
echo  [2/7] Checking pnpm...
where pnpm >nul 2>nul
if errorlevel 1 (
    echo       pnpm not found. Enabling via corepack...
    where corepack >nul 2>nul
    if errorlevel 1 (
        echo.
        echo  [ERROR] corepack not found after Node.js install.
        echo          Please reopen this script, or install Node.js from https://nodejs.org
        pause
        exit /b 1
    )
    call corepack enable
    call corepack prepare pnpm@11.7.0 --activate
    call :refreshenv
)
where pnpm >nul 2>nul
if errorlevel 1 (
    echo.
    echo  [ERROR] pnpm is still not available.
    echo          Please reopen this script and try again.
    pause
    exit /b 1
) else (
    echo       pnpm OK:
    call pnpm --version
)
echo.

REM ─── Step 3: Check Ollama ──────────────────────────────────
echo  [3/7] Checking Ollama...
where ollama >nul 2>nul
if errorlevel 1 (
    echo       Ollama not found. Installing via winget...
    winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements -h
    if errorlevel 1 (
        echo.
        echo  [WARNING] Could not install Ollama automatically.
        echo           Please install manually from https://ollama.com
        echo           Then run this script again.
        echo           ^(Cloud AI features will not work without Ollama^)
        echo.
        pause
    ) else (
        echo       Ollama installed. You may need to restart this script.
        call :refreshenv
    )
) else (
    echo       Ollama OK:
    ollama --version
)
echo.

REM ─── Step 4: Start Ollama server if not running ────────────
echo  [4/7] Checking Ollama server...
curl -s http://localhost:11434/api/tags >nul 2>nul
if errorlevel 1 (
    echo       Starting ollama serve ^(in background^)...
    start "" /B ollama serve
    timeout /t 3 /nobreak >nul
    curl -s http://localhost:11434/api/tags >nul 2>nul
    if errorlevel 1 (
        echo       [WARNING] Ollama server didn't start. AI features will not work.
        echo                Try running 'ollama serve' in a separate terminal.
    ) else (
        echo       Ollama server running.
    )
) else (
    echo       Ollama server already running.
)
echo.

REM ─── Step 5: Pull default model if none installed ──────────
echo  [5/7] Checking installed models...
for /f "delims=" %%i in ('ollama list 2^>nul ^| findstr /v "NAME" ^| findstr /v "^$"') do set HAS_MODELS=1
if not defined HAS_MODELS (
    echo       No models found. Pulling llama3.1 ^(4.7GB, one-time download^)...
    echo       This may take 5-15 minutes depending on your internet.
    ollama pull llama3.1
    if errorlevel 1 (
        echo       [WARNING] Could not pull llama3.1. Try 'ollama pull llama3.1' manually.
    ) else (
        echo       Model llama3.1 ready.
    )
) else (
    echo       Models already installed:
    ollama list
)
echo.

REM ─── Step 6: Install app dependencies ──────────────────────
echo  [6/7] Installing app dependencies...
cd /d "%~dp0"
set "APP_RUNTIME=%~dp0runtime"
if not exist "%APP_RUNTIME%\temp" mkdir "%APP_RUNTIME%\temp"
if not exist "%APP_RUNTIME%\home" mkdir "%APP_RUNTIME%\home"
if not exist "%APP_RUNTIME%\prisma-home" mkdir "%APP_RUNTIME%\prisma-home"
if not exist "%APP_RUNTIME%\prisma-cache" mkdir "%APP_RUNTIME%\prisma-cache"
if not exist "%APP_RUNTIME%\npm-cache" mkdir "%APP_RUNTIME%\npm-cache"
if not exist "%APP_RUNTIME%\playwright-browsers" mkdir "%APP_RUNTIME%\playwright-browsers"
if not exist "%~dp0prisma\db" mkdir "%~dp0prisma\db"
set "TEMP=%APP_RUNTIME%\temp"
set "TMP=%APP_RUNTIME%\temp"
set "TMPDIR=%APP_RUNTIME%\temp"
set "HOME=%APP_RUNTIME%\home"
set "USERPROFILE=%APP_RUNTIME%\home"
set "APPDATA=%APP_RUNTIME%"
set "LOCALAPPDATA=%APP_RUNTIME%"
set "PRISMA_HOME=%APP_RUNTIME%\prisma-home"
set "XDG_CACHE_HOME=%APP_RUNTIME%\prisma-cache"
set "NPM_CONFIG_CACHE=%APP_RUNTIME%\npm-cache"
set "PLAYWRIGHT_BROWSERS_PATH=%APP_RUNTIME%\playwright-browsers"
set "PNPM_STORE=%~d0\.pnpm-store\v11"
if exist "%~dp0node_modules\.bin\next.cmd" (
    echo       Dependencies already installed.
) else (
    echo       Using pnpm...
    set "CI=true"
    call pnpm install --store-dir "%PNPM_STORE%" --no-frozen-lockfile --network-concurrency=1 --fetch-retries=10 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
    if errorlevel 1 (
        set "CI="
        echo  [ERROR] pnpm install failed.
        pause
        exit /b 1
    )
    set "CI="
    call pnpm approve-builds --all
    call pnpm rebuild
)
echo       Creating database...
call pnpm exec prisma db push
if errorlevel 1 (
    echo  [ERROR] Database setup failed.
    pause
    exit /b 1
)
echo       Installing Playwright Chromium...
call pnpm exec playwright install chromium
if errorlevel 1 (
    echo       [WARNING] Playwright Chromium install failed. Browser automation may not work.
)
echo.

REM ─── Step 7: Start the app ─────────────────────────────────
echo  [7/7] Starting Documentary Studio...
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  App is starting at http://localhost:3000                ║
echo  ║                                                          ║
echo  ║  This window MUST stay open while you use the app.       ║
echo  ║  To stop the app: close this window or press Ctrl+C.     ║
echo  ║                                                          ║
echo  ║  When the app opens in your browser:                     ║
echo  ║   - Click "AI provider" → Ollama → Test → Save           ║
echo  ║   - Click "Start tunnel" to get a public URL             ║
echo  ║     ^(paste that URL in your AI chat so I can push        ║
echo  ║      visual plans and code to your app^)                  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

REM Open browser after 3 seconds (give server time to start)
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

REM Start the dev server (this blocks until Ctrl+C)
call pnpm dev

pause

REM ─── Helper: refresh environment variables ─────────────────
:refreshenv
REM Re-read PATH from registry (handles newly installed tools)
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
for /f "usebackq tokens=2,*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul`) do set "SYS_PATH=%%B"
for /f "usebackq tokens=2,*" %%A in (`reg query "HKCU\Environment" /v PATH 2^>nul`) do set "USR_PATH=%%B"
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\Ollama;%APPDATA%\npm;%LOCALAPPDATA%\Microsoft\WindowsApps;%USR_PATH%;%SYS_PATH%;%PATH%"
goto :eof
