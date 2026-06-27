@echo off
REM ============================================================
REM RESUME.bat — Codex Agent Resume Script
REM Run this if your context was compacted.
REM It tells you exactly where to resume.
REM ============================================================

echo.
echo  ================================================
echo   CODEX AGENT - RESUME STATUS
echo  ================================================
echo.

REM Check if PROGRESS.md exists
if not exist "PROGRESS.md" (
    echo  ERROR: PROGRESS.md not found. Start from Step 1.
    echo  Read AGENTS.md for the full plan.
    exit /b 1
)

echo  Reading PROGRESS.md...
echo.

REM Show the current state section
findstr /C:"Last updated" /C:"Current step" /C:"Overall status" PROGRESS.md

echo.
echo  ================================================
echo  INSTRUCTIONS:
echo  1. Read AGENTS.md for the full 6-step plan
echo  2. Read PROGRESS.md for detailed log
echo  3. Resume from the step shown above
echo  4. Update PROGRESS.md after EACH step
echo  5. Commit after every 2 steps
echo  ================================================
echo.

REM Show the step status table
echo  STEP STATUS:
findstr /R /C:"^| [0-9]\." PROGRESS.md

echo.
echo  Next action: Open AGENTS.md and PROGRESS.md, then continue.
echo.
