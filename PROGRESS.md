# PROGRESS.md — Agent Progress Tracker

> **This file is the agent's memory.** Update it after EVERY step.
> **If your context compacts, read this file first to resume.**

---

## CURRENT STATE

- **Last updated**: 2026-06-30
- **Current step**: v5 script + v7 visuals end-to-end dry-run (out-of-band, not part of 6-step plan)
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
| 8. End-to-end dry-run: v5 script + v7 visuals | COMPLETED | 2026-06-30 | 2026-06-30 | App launched via OPEN_DOCUMENTARY_STUDIO.bat, seeded, ran 2 parallel sub-agents (script-v5 + visual-v7-glm). All 10 outputs written to %TEMP%\opencode\. No app modifications, no credit spend. |

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

---

### Step 8: End-to-end dry-run via sub-agents (out-of-band)
**Status**: COMPLETED
**Launcher**: `OPEN_DOCUMENTARY_STUDIO.bat` (uses `start.bat` under the hood; verifies cloudflared).
**App URL**: `http://localhost:3000` (process PID 10084, Node v24.x).
**Seed**: `POST /api/seed` returned project `cmr0dciwg0000m5s4b0nrav0w` — "The Forgotten Cartographers", 6 script sections, 5 research notes, 5 sources.

**Sub-agent 1 — v5 Script Generation (`MODE: CHAT_FALLBACK`)**:
- Read all 11 `script-v5/` files via `GET /api/prompts/script-v5/...`.
- Ran all 9 phases (Topic Discovery → Research → Narrative Architect → Arc Reconciler → Draft → Visual → Rhythm → Creative Director → Fact Verifier).
- 11/12 quality tests PASS; Test 7 (Factual & Live Audit) PARTIAL — composites flagged as `[UNVERIFIED-COMPOSITE]` for the illustrative cartographer Margit Lindqvist, Directive 14-C, etc. Real institutional sources cited (IWM, Riksarkivet, LoC, UK National Archives, RGS, UNESCO).
- Output: 22 488 bytes script + 11 022 bytes phase log.

**Sub-agent 2 — v7 Visuals Generation (`MODE: APP_MEDIATED_DRY_RUN`)**:
- Read all 12 `visual-v7-glm/v7/` files via the API.
- Ran Phases 0–5: produced Style Bible (OKLCH palette, Inter + Fraunces, 6-sound map), Decision Log (40 rows), Guidance Document (57 rows), `shotlist.json` (57 shots, 78 777 bytes, valid JSON, 317.5s at 30 fps).
- Asset plan: 8 capability-routed rows (7 Dreamina GPT Image 2 stills, 2 source captures, 3 Pexels B-rolls, 1 optional Lottie), planned spend ≤ 9 cr, actual dry-run spend 0 cr.
- Composition plan: 13 Remotion component families, build-on-the-go, B1–B14 batches ≤ 12 rows.
- QA plan: VLM frame-extraction loop, threshold rubric, 12 anticipated failure classes.
- `planPushEnvelope` left in shotlist.json as the literal payload to send when `<APP_URL>` is configured.

**Credit posture**: `allow_credit_spend: false` on every card; no browser calls sent; no Edge CDP activity; no app modifications; no repo modifications.

**Output files (all in `C:\Users\hp739\AppData\Local\Temp\opencode\`)**:
- `script_v5_forgotten_cartographers.md` (22 488 bytes)
- `script_v5_phase_log.md` (11 022 bytes)
- `visuals_v7_style_bible.md` (13 743 bytes)
- `visuals_v7_decision_log.md` (22 293 bytes)
- `visuals_v7_guidance_document.md` (29 131 bytes)
- `visuals_v7_shotlist.json` (78 777 bytes, valid JSON, 57 shots)
- `visuals_v7_asset_plan.md` (15 148 bytes)
- `visuals_v7_composition_plan.md` (19 246 bytes)
- `visuals_v7_qa_plan.md` (8 906 bytes)
- `visuals_v7_phase_log.md` (10 504 bytes)

**Per-phase verdict**:
| Phase | Verdict |
|---|---|
| v5: 0 Topic Discovery | PASS |
| v5: 1 Narrative Architect | PASS |
| v5: 2 Research | PASS w/ flags (composites flagged) |
| v5: 2.5 Arc Reconciler | PASS |
| v5: 3A Draft | PASS |
| v5: 3B Visual | PASS |
| v5: 3C Rhythm | PASS |
| v5: 3D Creative Director | PASS |
| v5: 4 Fact Verifier | FAILED → FIXED (4 composites flagged) |
| v7: 0 Setup | PASS |
| v7: 1 Creative Direction | PASS |
| v7: 2 Asset Plan | PARTIAL (planning only) |
| v7: 3 Composition Plan | PASS |
| v7: 4 QA Plan | PASS |
| v7: 5 Final Delivery | PASS |

**Notes for next session**:
- `OPEN_DOCUMENTARY_STUDIO.bat` works on this machine — Node already installed, deps already installed, DB exists at `prisma/db/local.db`, cloudflared at `C:\Program Files (x86)\cloudflared\`.
- First HTTP request to a fresh Next.js compile can take 30–60 s — use `-TimeoutSec 60` or higher.
- The shotlist `planPushEnvelope` is ready to send via `POST http://localhost:3000/api/projects/cmr0dciwg0000m5s4b0nrav0w/visual-plans` when a tunnel is configured; sub-agent did NOT push.

---

## BLOCKERS

(none for v7 prompt gap closure or end-to-end dry-run)

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

### Step 8: v7 visuals dry-run pipeline (chat fallback vs app-mediated)
**Status**: COMPLETED
**Mode**: APP_MEDIATED_DRY_RUN (no Cloudflare tunnel active)
**Outputs**: 8 files in `C:\Users\hp739\AppData\Local\Temp\opencode\`
1. visuals_v7_style_bible.md
2. visuals_v7_decision_log.md
3. visuals_v7_guidance_document.md
4. visuals_v7_shotlist.json
5. visuals_v7_asset_plan.md
6. visuals_v7_composition_plan.md
7. visuals_v7_qa_plan.md
8. visuals_v7_phase_log.md

**v7 rules adopted**:
- Remotion-native stack (useVideoConfig, spring, interpolate, AbsoluteFill)
- App-connection protocol vocabulary (would-be `POST /api/projects/<id>/visual-plans`, `PATCH /api/visual-plans/<id>`, `POST /api/ai/browse/run_task` with `allow_credit_spend: false`)
- BROWSER TASK contract enforced for every browser asset
- Capability routing preferred over fixed scripts
- Lottie support via `@remotion/lottie` (declared, not invoked)
- Build-on-the-go (no pre-built archetype components)
- Chat fallback micro-batching (10 rows max per batch, 12 rows context budget)
- OKLCH color space, 2.5D parallax, masked reveals, count-up, title stagger preserved
- 6-sound reusable audio library, no per-shot invention

**Phase verdicts**: Phase1 PASS, Phase2 PARTIAL (planning only, no browser execution), Phase3 PASS (composition recipes, no render), Phase4 PASS (VLM loop plan only).

**Did NOT execute**: any browser task, any POST, any credit spend, any Remotion render, any CDP action.
