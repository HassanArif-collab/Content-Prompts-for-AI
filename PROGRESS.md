# PROGRESS.md — Agent Progress Tracker

> **This file is the agent's memory.** Update it after EVERY step.
> **If your context compacts, read this file first to resume.**

---

## CURRENT STATE

- **Last updated**: 2026-06-29
- **Current step**: v7 prompt gap closure (out-of-band, not part of 6-step plan)
- **Overall status**: IN PROGRESS

---

## STEP STATUS

| Step | Status | Started | Completed | Notes |
|------|--------|---------|-----------|-------|
| 1. Re-read plan, inspect worktree | COMPLETED | 2026-06-27 | 2026-06-27 | Current v7 prompt is Remotion-native; post-pull worktree was clean. |
| 2. Start app with G: redirect | BLOCKED | 2026-06-27 | 2026-06-27 | G: redirect works, but the real start.bat test entered a Node winget/UAC path and did not reach port 3000. |
| 3. GLM HTTP smoke test | COMPLETED | 2026-06-27 | 2026-06-27 | Production server on port 3001 passed 10/10, including a real Remotion PNG. |
| 4. UI + Remotion preview test | NOT STARTED | - | - | - |
| 5. Dreamina/Flow routing test | NOT STARTED | - | - | - |
| 6. Typecheck, commit, push | NOT STARTED | - | - | - |
| 7. v7 prompt gap closure (surgical) | COMPLETED | 2026-06-29 | 2026-06-29 | Restored GLM-era stability, logging, technique routing into v7. Pushed as commit 55990ff. |

---

## DETAILED LOG

### Step 1: Re-read plan, inspect worktree
**Status**: COMPLETED
**Findings**:
- Read `CODEX-AGENT-PLAN.md`, the full current `prompts/visual-v7-glm/v7/Visuals Generation Prompt v7.md`, `AGENTS.md`, and recent git history.
- The current v7 visual prompt intentionally defines Remotion (React + FFmpeg) as the canonical render stack and includes the app bridge, browser capability routing, and credit safety rules.
- `CODEX-AGENT-PLAN.md` still contains historical HTML/GSAP merge language; it was not used to rewrite the newer Remotion workflow.
- The app worktree was clean after checkpoint commit `0d1088c` and merge commit `586d805` pulled the progress-tracking files.
- Existing implementation includes nested prompt retrieval, GLM HTTP smoke coverage, Remotion preview rendering, and browser task routing. Remaining steps require launcher/UI/dry-run verification.

---

### Step 2: Start app with G: redirect
**Status**: BLOCKED
**Server URL**: `http://localhost:3001` verified for the production build; `http://localhost:3000` was not reached through `start.bat`.
**Issues**:
- The launcher correctly redirects app temp/cache, Prisma, npm, Playwright, and pnpm store data to the workspace/G: drive.
- A real `start.bat` run unexpectedly entered the Node winget installer despite Node having been present, then stalled on the administrator/UAC installation stage.
- The interrupted upgrade removed the previous Node runtime; Node.js LTS `v24.18.0` was repaired successfully with winget and Corepack `0.35.0` was verified.
- All batch checks were surgically changed from early-expanded `%errorlevel%` expressions to the safe `if errorlevel 1` form. A full clean rerun is still required before this step can be promoted from BLOCKED.
- An isolated batch smoke proved the elevated launcher imports registry PATH entries with literal `%SystemRoot%`, hiding `where.exe`; `refreshenv` now preserves explicit Windows system paths and the pnpm version probe uses `call` so control returns to `start.bat`.
- The full rerun now reaches Node, pnpm, Ollama, and Step 4, but `cmd.exe` still stops on mixed LF/CRLF parsing. Mechanical CRLF normalization is the remaining launcher fix awaiting execution permission.

---

### Step 3: GLM HTTP smoke test
**Status**: COMPLETED
**Test results**:
- Independent local sub-agent confirmed the smoke script's prompt/project/script/visual-plan/Remotion/browser-health coverage and made no edits or credit-spending calls; its own runtime attempt was interrupted by a transient C: disk-space failure.
- Main-agent production run: **10/10 PASS** against `http://localhost:3001`.
- Verified API health, prompt index, nested visual-v7 and script-v5 prompt retrieval, project/script access, visual-plan create/update, and browser health.
- Remotion preview rendered a real `1280x720` PNG (`975,972` base64 characters) through `POST /api/render/preview`.
- Browser health failed safely because Edge CDP `127.0.0.1:9222` was not active; no Dreamina/Flow generation call was made and no credits were spent.

---

### Step 4: UI + Remotion preview test
**Status**: NOT STARTED
**Test results**: (to be filled)

---

### Step 5: Dreamina/Flow routing test
**Status**: NOT STARTED
**Test results**: (to be filled)

---

### Step 6: Typecheck, commit, push
**Status**: NOT STARTED
**Commit hash**: (to be filled)
**Push status**: (to be filled)

---

### Step 7: v7 prompt gap closure (out-of-band)
**Status**: COMPLETED
**Commit hash**: `55990ff`
**Push status**: PUSHED to `origin/main`
**Scope**: 6 surgical edits, 34 insertions, 2 deletions across 4 files.

**Findings vs v5/v6 GLM**:
- Pexels B-Roll (sec 4) and Lottie Files (sec 5) were ALREADY present in v7 `agent_asset_generation.md` (lines 102, 105) — earlier comparison misread them as missing.
- Genuinely missing items: log format spec, micro-batching/context budget rules, phase state format, per-line technique delegation from Creative Direction, beat-type guidance table, two missing video add-ons, stale `v6 COMPLETE` label.

**Edits applied**:
1. `agent_asset_generation.md`: restored log format `[AGENT][TS][FILE][STATUS: OK/FALLBACK/REGEN/BLOCKED/FAILED][NOTE]`.
2. `Visuals Generation Prompt v7.md`: added `CHAT FALLBACK MODE` section with micro-batching (10 max), context budget (12 rows max), phase state format, and `MODE: APP_MEDIATED|CHAT_FALLBACK` declaration. Fixed stale `DOCUMENTARY VISUAL FACTORY v6 COMPLETE` label to `v7`.
3. `agent_creative_direction.md`: added 5-line subsection delegating per-line Visual Technique + Narrative Purpose assignment to `agent_visual_planner.md` (which produces `shotlist.json`).
4. `prompt_formulas.md`: added Beat Type Guidance table (7 rows mapping beat category -> preferred technique) and 2 missing video add-ons (corruption/institutional decay, evidence/documents).

**Preserved**: v7 app-connection protocol, Remotion stack, BROWSER TASK contract, tool router, browser runtime, browser capabilities, Lottie support, visual archetypes, failure taxonomy, visual guidance template, composition build, QA repair, visual planner.

**Notes for next session**:
- Chat Fallback Mode is opt-in: only activates when user runs from chat without providing `<APP_URL>`. App-mediated runs are unaffected.
- If v6 Claude-specific changes are wanted later, compare against `Visual Generation v6 Claude/` in old directory — not done here.

---

## BLOCKERS

(none for v7 prompt gap closure)

(Add any blockers here. If a step is blocked, note why and move on.)

---

## RESUME INSTRUCTIONS

If you are resuming after a context compaction:

1. Read the "CURRENT STATE" section above
2. Find the first step with status "NOT STARTED"
3. Read the detailed log for any notes from previous attempts
4. Resume from that step
5. Do NOT redo steps marked "COMPLETED"

---

## FINAL SUMMARY

(To be filled when all steps are done or blocked.)

- Total steps completed: 0/6
- Total steps blocked: 0/6
- App is production-ready: NO
- Changes pushed to GitHub: NO
- Commit hash: (none)
