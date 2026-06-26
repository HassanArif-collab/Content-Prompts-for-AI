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

REM ─── Step 1: Check Node.js ─────────────────────────────────
echo  [1/7] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo       Node.js not found. Installing via winget...
    echo       (this may take 1-2 minutes, please wait)
    winget install --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements -h
    if %errorlevel% neq 0 (
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

REM ─── Step 2: Check Bun ─────────────────────────────────────
echo  [2/7] Checking Bun (faster than npm)...
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo       Bun not found. Installing...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex"
    if %errorlevel% neq 0 (
        echo       Bun install failed, will use npm instead.
        set USE_NPM=1
    ) else (
        call :refreshenv
    )
) else (
    echo       Bun OK:
    bun --version
)
echo.

REM ─── Step 3: Check Ollama ──────────────────────────────────
echo  [3/7] Checking Ollama...
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo       Ollama not found. Installing via winget...
    winget install --id Ollama.Ollama --accept-package-agreements --accept-source-agreements -h
    if %errorlevel% neq 0 (
        echo.
        echo  [WARNING] Could not install Ollama automatically.
        echo           Please install manually from https://ollama.com
        echo           Then run this script again.
        echo           (Cloud AI features will not work without Ollama)
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
if %errorlevel% neq 0 (
    echo       Starting ollama serve (in background)...
    start "" /B ollama serve
    timeout /t 3 /nobreak >nul
    curl -s http://localhost:11434/api/tags >nul 2>nul
    if %errorlevel% neq 0 (
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
    echo       No models found. Pulling llama3.1 (4.7GB, one-time download)...
    echo       This may take 5-15 minutes depending on your internet.
    ollama pull llama3.1
    if %errorlevel% neq 0 (
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
if defined USE_NPM (
    echo       Using npm...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo       Creating database...
    call npx prisma db push
) else (
    echo       Using bun...
    call bun install
    if %errorlevel% neq 0 (
        echo  [ERROR] bun install failed.
        pause
        exit /b 1
    )
    echo       Creating database...
    call bun run db:push
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
echo  ║     (paste that URL in your AI chat so I can push        ║
echo  ║      visual plans and code to your app)                  ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

REM Open browser after 3 seconds (give server time to start)
start "" /B cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

REM Start the dev server (this blocks until Ctrl+C)
if defined USE_NPM (
    call npm run dev
) else (
    call bun run dev
)

pause

REM ─── Helper: refresh environment variables ─────────────────
:refreshenv
REM Re-read PATH from registry (handles newly installed tools)
for /f "usebackq tokens=2,*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul`) do set "SYS_PATH=%%B"
for /f "usebackq tokens=2,*" %%A in (`reg query "HKCU\Environment" /v PATH 2^>nul`) do set "USR_PATH=%%B"
set "PATH=%USR_PATH%;%SYS_PATH%"
goto :eof
