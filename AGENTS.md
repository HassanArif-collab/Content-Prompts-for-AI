# AGENTS.md — Codex Agent Operating Instructions

> **READ THIS FILE FIRST.** It is your single source of truth.
> **After completing each step, update `PROGRESS.md` immediately.**
> **If your context compacts, read `PROGRESS.md` to resume.**

---

## THE TASK

Make the Documentary Studio app (content-app/) production-ready for a non-technical user on Windows 11. The user will run start.bat, the app opens, and everything works with GLM (via Ollama) + Playwright + Remotion.

## THE 6-STEP PLAN

### Step 1: Re-read authoritative app plan and inspect current worktree
- Read CODEX-AGENT-PLAN.md
- Read prompts/visual-v7-glm/v7/Visuals Generation Prompt v7.md
- Run git status and git log --oneline -5
- Identify what's already done vs what needs fixing
- When done: Update PROGRESS.md with findings

### Step 2: Start the app with runtime/cache data redirected to G:
- Ensure content-app/start.bat redirects temp/cache to the workspace drive
- Run start.bat (or manually: pnpm install && pnpm run db:push && pnpm run dev)
- Verify http://localhost:3000 responds
- When done: Update PROGRESS.md with server status

### Step 3: Run independent local sub-agent and GLM HTTP pipeline smoke
- Run node content-app/scripts/glm-agent-http-smoke.mjs (if it exists)
- If it doesn't exist, create it. It should:
  - GET /api/prompts (verify nested folders work)
  - GET /api/prompts/visual-v7-glm/v7/Visuals Generation Prompt v7 (verify file content)
  - POST /api/seed (create sample project)
  - GET /api/projects (verify project exists)
  - POST /api/projects/<id>/visual-plans (create a test plan)
  - PATCH /api/visual-plans/<planId> (update plan)
  - POST /api/render/preview (render HTML to PNG)
  - GET /api/ai/browse/edge-status (check Edge CDP)
- When done: Update PROGRESS.md with test results

### Step 4: Test the app UI and Remotion preview through the browser
- Use Playwright (installed in the app) to open http://localhost:3000 in Edge
- Navigate to a project, Visual Plans tab, open a plan, click Render preview
- Verify the preview image appears
- When done: Update PROGRESS.md with UI test results

### Step 5: Test Dreamina/Flow routing safely without spending credits
- GET /api/ai/browse/edge-status (verify status)
- POST /api/ai/browse/route-task with a test task (verify routing)
- POST /api/ai/browse/run_task with capability dreamina.still_image and allow_credit_spend false
- DO NOT set allow_credit_spend to true (costs real money)
- When done: Update PROGRESS.md with routing test results

### Step 6: Run typecheck/build, audit changes, commit and push
- Run pnpm run build or npx tsc --noEmit (verify no type errors)
- Run git add -A and git status (review all changes)
- Run git commit -m "Production-ready: full pipeline tested"
- Run git push origin main
- When done: Update PROGRESS.md with final status and commit hash

---

## RESUME PROTOCOL

If your context was compacted (you see "Context automatically compacted"):

1. Read PROGRESS.md to find the last completed step
2. Read AGENTS.md (this file) to refresh the plan
3. Resume from the NEXT step after the last completed one
4. Do NOT redo completed steps unless PROGRESS.md says they failed

## RULES

1. Update PROGRESS.md after EVERY step, not at the end
2. Commit after every 2 steps, don't wait until the end
3. If a step fails 3 times, skip it. Note it in PROGRESS.md as blocked, move on
4. Never spend credits. allow_credit_spend must always be false in tests
5. Never close the user's Edge. Use a separate profile or skip the test
6. Be honest. If something doesn't work, write FAILED in PROGRESS.md
7. Push when done. Step 6 MUST end with git push origin main

## WHAT "PRODUCTION-READY" MEANS HERE

- start.bat works on a fresh Windows 11 PC
- App opens at http://localhost:3000
- All API routes respond correctly
- Prompt files are accessible via /api/prompts
- Visual plans can be created, updated, and rendered
- Remotion preview produces a real PNG
- Browser automation health check works
- No type errors
- Dreamina/Flow credit-spending is NOT tested (costs money) - just verify dry-run
- Cloudflare tunnel works in code but may not be tested - that's OK

## WHAT'S NOT IN SCOPE

- Don't rewrite the prompts (they're done)
- Don't add authentication (future task)
- Don't add Flow video generation scripts (future task)
- Don't add article capture (future task)
- Don't optimize for production deployment (this is a local app)
