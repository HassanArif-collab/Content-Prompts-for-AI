# Content-Prompts-for-AI

Prompt library for AI-driven documentary content production.

## What's here

| Folder | Purpose | Render Stack | App Connected |
|---|---|---|---|
| `script-v5/` | Script Generation v5 for GLM (ZAI Chat) — app-connected | N/A | ✅ (pushes script + research + sources + tasks to app) |
| `script-v4/` | Script Generation Prompt v4 (original, 10-agent pipeline) | N/A | ✅ (has APP PUSH PROTOCOL section added) |
| `visual-v7-glm/` | Visual Generation v7 for GLM (ZAI Chat) — app-connected | Remotion | ✅ (full app connection, tools inside app) |
| `visual-v6-claude/` | Visual Generation v6 for Claude Code | Remotion | ❌ (reference only) |
| `visual-v6-glm/` | Visual Generation v6 for GLM (older) | HTML/CSS + GSAP | ❌ (reference only) |

## Quick start

1. **Run the Documentary Studio app** on your Windows PC
   - Download `documentary-studio-local.zip`
   - Double-click `start.bat`
   - App opens at `http://localhost:3000`

2. **Start the Cloudflare tunnel** in the app
   - Click "Start tunnel" in the top banner
   - Copy the URL (e.g. `https://random-words.trycloudflare.com`)

3. **Paste the URL in your AI chat** (Z.ai, Claude, etc.)

4. **Tell the AI what to do:**
   - For visual plans: "Read `visual-v7-glm/v7/Visuals Generation Prompt v7.md` and execute"
   - For scripts: "Read `script-v5/Script Generation Prompt v5.md` and execute"

The AI will:
- Fetch your script from the app (always fresh)
- Generate a plan / script
- Push it to the app
- Wait for your approval in the app's UI
- Iterate based on your feedback
- Generate code + trigger browser tasks after approval

## Key files

- `APP-CONNECTION-PROTOCOL.md` — How any AI agent connects to the app (read this first)
- `CODEX-AGENT-PLAN.md` — Detailed plan for the Codex agent that maintains this repo
- `visual-v7-glm/v7/Visuals Generation Prompt v7.md` — Main visual generation prompt (app-connected)
- `script-v5/Script Generation Prompt v5.md` — Main script generation prompt (app-connected, v5)
- `script-v4/Script Generation Prompt v4.md` — Original script generation prompt (v4, with APP PUSH PROTOCOL added)

## The app

The Documentary Studio app is a separate project (Next.js + Prisma + SQLite). It provides:
- Project management (dashboard, projects)
- Research tab (hierarchical tree of topics + links)
- Script tab (with live runtime calculator)
- Storyboard tab (scene planning)
- Visual Plans tab (review/approve/feedback for AI-pushed plans)
- Sources tab (citation library)
- Production tab (kanban task board)
- AI Co-pilot sidebar (streaming chat with Ollama or ZAI cloud)
- Cloudflare tunnel integration (one-click public URL)
- Browser automation bridge (spawns `tools/browser/browser_task.js`)

## Browser automation

The `visual-v7-glm/tools/` folder contains:
- `browser/browser_task.js` — Main entry, runs capability tasks (Dreamina, Flow, article capture)
- `browser/edge_keepopen.js` — Launches Edge with CDP debug port 9222
- `browser/browser_scout.js` — UI scouting for new sites
- `browser/browser_deep_scout.js` — Deep UI mapping
- `dreamina/dreamina_image_probe.js` — Dreamina image generation
- `dreamina/dreamina_download_latest.js` — Downloads generated images
- `routing/visual_tool_router.js` — Routes tasks to the right tool

The app's `/api/ai/browse/run_task` endpoint spawns these scripts on the user's PC.

## License

Private — for the owner's use only.
