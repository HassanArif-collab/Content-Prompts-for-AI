# CODEX AGENT — COMPLETE EXECUTION PLAN (v2)
## Project: Content-Prompts-for-AI → v7 GLM Visual + v5 Script + App Integration

> **Read this entire file before doing anything.** This is your single source of truth.

---

## YOUR ROLE

You are a Codex agent running in a sandbox. Your job:
1. Clone the Content-Prompts-for-AI repo (user creates it first)
2. Verify the v7 GLM and v5 Script files are complete and properly merged
3. Fix any errors (missing content, Remotion refs that should be HTML/GSAP, etc.)
4. Push everything to GitHub
5. Update prompts so any AI agent knows how to use the app

**You are NOT the creative AI.** You are the infrastructure engineer.

---

## REPOSITORY STRUCTURE

```
Content-Prompts-for-AI/
├── README.md
├── CODEX-AGENT-PLAN.md                    ← THIS FILE
├── APP-CONNECTION-PROTOCOL.md
├── script-v5/                             ← NEW: v5 with app connection
│   ├── Script Generation Prompt v5.md
│   ├── agent_topic_discovery.md
│   ├── agent_narrative_architect.md
│   ├── agent_research.md
│   ├── agent_arc_reconciler.md
│   ├── agent_draft_scriptwriter.md
│   ├── agent_visual_architect.md
│   ├── agent_rhythm_polish.md
│   ├── agent_creative_director.md
│   ├── agent_fact_verifier.md
│   └── quality_tests.md
├── script-v4/                             ← Original v4 (kept for reference, has APP PUSH PROTOCOL added)
│   └── (same 11 files)
├── visual-v7-glm/                         ← NEW: v7 GLM with app connection + browser tools
│   ├── v7/
│   │   ├── Visuals Generation Prompt v7.md
│   │   ├── AI_TOOLS_GUIDE.md              ← MERGED: GLM base + Claude's browser/Dreamina/Flow content
│   │   ├── agent_visual_planner.md        ← NEW from Claude v6 (Remotion→GSAP swapped)
│   │   ├── browser_runtime.md             ← NEW from Claude v6
│   │   ├── browser_capabilities.md        ← NEW from Claude v6 (Remotion→GSAP swapped)
│   │   ├── agent_asset_generation.md      ← GLM base + Claude's BROWSER TASK CONTRACT appended
│   │   ├── agent_composition_build.md     ← GLM v6 (1058 lines, HTML/GSAP)
│   │   ├── agent_creative_direction.md
│   │   ├── agent_qa_repair.md
│   │   ├── failure_taxonomy.md
│   │   ├── prompt_formulas.md
│   │   ├── template_doc_highlight.md
│   │   ├── visual_archetypes.md
│   │   └── visual_guidance_document_template.md
│   └── tools/
│       ├── README.md
│       ├── browser/
│       │   ├── browser_task.js
│       │   ├── browser_scout.js
│       │   ├── browser_deep_scout.js
│       │   └── edge_keepopen.js
│       ├── dreamina/
│       │   ├── dreamina_image_probe.js
│       │   └── dreamina_download_latest.js
│       └── routing/
│           └── visual_tool_router.js
├── visual-v6-claude/                      ← Kept for reference (Remotion-based)
│   └── (same as uploaded)
└── visual-v6-glm/                         ← Kept for reference (older GLM, no app connection)
    └── (same as uploaded)
```

---

## MERGE VERIFICATION CHECKLIST

The user's #1 concern: **nothing from v6 Claude or v6 GLM should be missed.** Verify each file:

### visual-v7-glm/v7/ files

| File | Base | What was added from Claude v6 | Remotion refs swapped? |
|---|---|---|---|
| `Visuals Generation Prompt v7.md` | NEW | App connection contract, API table, Phase 0.5, rules 20-22 | N/A (new file) |
| `AI_TOOLS_GUIDE.md` | Claude v6 | (was rewritten to merge both) | ✅ "Remotion component" → "HTML/CSS/GSAP composition" |
| `agent_visual_planner.md` | Claude v6 | (was missing from GLM) | ✅ Remotion→GSAP swapped |
| `browser_runtime.md` | Claude v6 | (was missing from GLM) | ✅ No Remotion refs found |
| `browser_capabilities.md` | Claude v6 | (was missing from GLM) | ✅ Remotion→GSAP swapped |
| `agent_asset_generation.md` | GLM v6 | BROWSER TASK CONTRACT section appended | ✅ No Remotion refs in GLM base |
| `agent_composition_build.md` | GLM v6 | (1058 lines, HTML/GSAP — check if Claude added non-Remotion craft) | N/A (GLM is HTML/GSAP) |
| `agent_creative_direction.md` | GLM v6 | (check Claude's 38 unique lines for non-Remotion additions) | N/A |
| `agent_qa_repair.md` | GLM v6 | (check Claude's 3 unique lines) | N/A |
| `failure_taxonomy.md` | GLM v6 | (check Claude's 18 unique lines for non-Remotion failures) | N/A |
| `prompt_formulas.md` | GLM v6 | (check Claude's 40 unique lines) | N/A |
| `template_doc_highlight.md` | GLM v6 | (check Claude's 17 unique lines) | N/A |
| `visual_archetypes.md` | GLM v6 | (nearly identical, 4 unique Claude lines) | N/A |
| `visual_guidance_document_template.md` | GLM v6 | (check Claude's 75 unique lines) | N/A |

### script-v5/ files

| File | Changes from v4 |
|---|---|
| `Script Generation Prompt v5.md` | Header updated to v5, APP CONNECTION rule added, Phase 0/2/3A/3D updated with app push instructions |
| All agent files | App Connection Note header added at top of each |

---

## STEP-BY-STEP EXECUTION

### Step 1: Wait for user to create the repo

The user must create `Content-Prompts-for-AI` at https://github.com/new (fine-grained PATs can't create repos). Once created:

```bash
git clone https://HassanArif-collab:<TOKEN>@github.com/HassanArif-collab/Content-Prompts-for-AI.git
cd Content-Prompts-for-AI
```

### Step 2: Copy files from the prepared output

The files are ready at `/home/z/my-project/output/content-prompts/`. Copy them:

```bash
cp -r /path/to/output/content-prompts/* .
```

### Step 3: Verify merge completeness

Run these checks:

```bash
# Check no Remotion refs remain in v7 GLM (except in the main prompt where they're intentional)
grep -rn "remotion\|Remotion\|useVideoConfig\|spring()\|interpolate()" visual-v7-glm/v7/ | grep -v "Visuals Generation Prompt v7.md" | grep -v "App Connection Note"

# Should return empty. If not, swap:
# "Remotion component" → "HTML/CSS/GSAP composition"
# "useVideoConfig" → "window._duration"
# "spring()" → "gsap.to()"
# "interpolate()" → "gsap.utils.interpolate()"
# "@remotion/lottie" → "lottie-web (if installed)"
# "remotion/src/shotlist.json" → "the plan's shotsJson"
```

### Step 4: Verify file counts

```bash
echo "v7 GLM prompts: $(ls visual-v7-glm/v7/*.md | wc -l)"  # Should be 14
echo "v7 GLM tools: $(find visual-v7-glm/tools -name '*.js' | wc -l)"  # Should be 7
echo "Script v5 prompts: $(ls script-v5/*.md | wc -l)"  # Should be 11
echo "Script v4 prompts: $(ls script-v4/*.md | wc -l)"  # Should be 11
```

### Step 5: Check each v7 file has the App Connection Note header

```bash
for f in visual-v7-glm/v7/*.md; do
  if ! head -1 "$f" | grep -q "App Connection Note"; then
    echo "MISSING HEADER: $f"
  fi
done
```

### Step 6: Commit and push

```bash
git add .
git commit -m "v7 GLM visual + v5 script with app connection

visual-v7-glm/: merges v6 Claude (browser tools, visual planner, browser runtime/capabilities)
with v6 GLM (HTML/GSAP render stack) + adds app connection protocol
- All Remotion refs swapped to HTML/CSS/GSAP equivalents
- BROWSER TASK CONTRACT added to agent_asset_generation.md
- AI_TOOLS_GUIDE.md fully merged with Claude's Dreamina/Flow details
- tools/ folder included (browser/, dreamina/, routing/)

script-v5/: v4 + app connection at every phase
- Phase 0: push candidates to app
- Phase 2: push research tree + sources
- Phase 3A: push script sections with inline footnotes
- Phase 3D: push final script + tasks + packaging
- All agent files have App Connection Note header

script-v4/: original kept for reference (has APP PUSH PROTOCOL section)
visual-v6-claude/ and visual-v6-glm/: kept for reference"

git push origin main
```

---

## WHAT THE CODEX AGENT SHOULD CHECK (merge quality)

The user's specific concern: "I believe you haven't removed the instructions from v6 for claude and v6 for glm and added things surgically rather than removing and rewriting everything."

For each v7 file, the Codex agent should verify:

1. **Start with the right base:**
   - For render-stack files (agent_composition_build, etc.): GLM v6 is the base (HTML/GSAP)
   - For tool/browser files (AI_TOOLS_GUIDE, browser_capabilities, etc.): Claude v6 is the base (has new browser content)
   - For the 3 new files (agent_visual_planner, browser_runtime, browser_capabilities): Claude v6, with Remotion→GSAP swaps

2. **All Claude v6 additions are present:**
   - Browser Runtime section in AI_TOOLS_GUIDE
   - BROWSER TASK CONTRACT in agent_asset_generation
   - Dreamina GPT Image 2 model rule
   - Google Flow credit costs and model details
   - Visual Planner agent
   - Browser capabilities and runtime contracts

3. **All GLM v6 content is preserved:**
   - HTML/CSS/GSAP render stack (not Remotion)
   - window.initAnimation, window._duration, window.animationComplete contract
   - Micro-batching render rule (10 compositions max)
   - Context budget rule (12 rows per build agent)
   - All duration matrix entries
   - All archetype specs

4. **No Remotion-specific content leaked into v7 GLM:**
   - No "Remotion component" (should be "HTML/CSS/GSAP composition")
   - No "useVideoConfig" (should be "window._duration")
   - No "spring()" (should be "gsap.to()")
   - No "@remotion/lottie" (should be "lottie-web if installed")
   - No "remotion/src/index.tsx" (should be "compositions/")
   - No "shotlist.json" as a file reference (should be "the plan's shotsJson")

---

## APP WIRING (for the Documentary Studio app)

The app at `/home/z/my-project/` has been updated:

1. **tools/ folder** — now has the organized structure from Claude v6:
   - `tools/browser/browser_task.js` — main entry
   - `tools/browser/edge_keepopen.js` — Edge CDP launcher
   - `tools/browser/browser_scout.js` — UI scouting
   - `tools/browser/browser_deep_scout.js` — deep UI mapping
   - `tools/dreamina/dreamina_image_probe.js` — Dreamina image generation
   - `tools/dreamina/dreamina_download_latest.js` — downloads generated images
   - `tools/routing/visual_tool_router.js` — routes tasks to right tool

2. **`/api/ai/browse/run_task`** — updated to spawn `tools/browser/browser_task.js` (new path)

3. **Playwright** — added to package.json as a dependency

4. **Visual Plans tab** — full review/approve/feedback UI with:
   - Plan cards with status badges
   - Shot list with archetype/duration/visual/motion/text/narration/asset
   - Feedback thread (user + AI + system messages)
   - Approve button → status = approved
   - "Save + copy" feedback button → copies to clipboard for pasting in chat
   - Remotion code display (HTML/CSS/GSAP code stored in `remotionCode` field)
   - Remotion preview display (base64 PNG stored in `remotionPreview` field)
   - 5-second polling for new plans pushed from chat

5. **Cloudflare tunnel** — one-click start/stop in the app UI:
   - `/api/tunnel/start` — spawns cloudflared, returns public URL
   - `/api/tunnel/stop` — kills the tunnel
   - `/api/tunnel/status` — returns current state
   - Green banner with URL + copy button when running

6. **start.bat** — Windows one-click auto-installer:
   - Checks/installs Node.js, Bun, Ollama
   - Starts Ollama server
   - Pulls llama3.1 if no models
   - Installs app deps + creates DB
   - Starts app + opens browser

---

## SECURITY

- **The GitHub token must NOT be committed to git.** Use environment variables or git credential helper.
- Add `.gitignore` entries for: `.z-ai-config`, `.ai-settings.json`, `*.db`, `node_modules/`, `.next/`
- The user's previous token was auto-revoked by GitHub's secret scanner. The new token is a fine-grained PAT.
- **Never paste tokens in chat.** Use `git remote set-url` with the token, then push.
