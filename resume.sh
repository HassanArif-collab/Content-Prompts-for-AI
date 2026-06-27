#!/bin/bash
# ============================================================
# resume.sh — Codex Agent Resume Script (Linux/Mac)
# Run this if your context was compacted.
# ============================================================

echo ""
echo "  ================================================"
echo "   CODEX AGENT - RESUME STATUS"
echo "  ================================================"
echo ""

if [ ! -f "PROGRESS.md" ]; then
    echo "  ERROR: PROGRESS.md not found. Start from Step 1."
    echo "  Read AGENTS.md for the full plan."
    exit 1
fi

echo "  Reading PROGRESS.md..."
echo ""

# Show current state
grep -E "Last updated|Current step|Overall status" PROGRESS.md

echo ""
echo "  ================================================"
echo "  INSTRUCTIONS:"
echo "  1. Read AGENTS.md for the full 6-step plan"
echo "  2. Read PROGRESS.md for detailed log"
echo "  3. Resume from the step shown above"
echo "  4. Update PROGRESS.md after EACH step"
echo "  5. Commit after every 2 steps"
echo "  ================================================"
echo ""

# Show step status
echo "  STEP STATUS:"
grep -E "^\| [0-9]\." PROGRESS.md

echo ""
echo "  Next action: Open AGENTS.md and PROGRESS.md, then continue."
echo ""
