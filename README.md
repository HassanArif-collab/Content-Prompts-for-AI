# Content-Prompts-for-AI

Prompt library + Documentary Studio app for AI-driven documentary content production.

## Repository Structure

```
Content-Prompts-for-AI/
├── README.md                          ← You are here
├── APP-CONNECTION-PROTOCOL.md         ← How any AI agent connects to the app
├── CODEX-AGENT-PLAN.md                ← Detailed plan for Codex agent
├── prompts/                           ← Canonical prompt library (edit here)
│   ├── script-v5/                     ← Script Gen v5 (app-connected, 11 files)
│   ├── script-v4/                     ← Script Gen v4 (original, 11 files)
│   ├── visual-v7-glm/                 ← Visual Gen v7 for GLM (14 prompts + 7 tools)
│   ├── visual-v6-claude/              ← Visual Gen v6 for Claude (reference)
│   └── visual-v6-glm/                 ← Visual Gen v6 for GLM (reference)
└── content-app/                       ← Documentary Studio app (Next.js)
    ├── src/                           ← App source code
    ├── prisma/                        ← Database schema
    ├── tools/                         ← Browser automation tools
    ├── prompts/                       ← Copy of canonical prompts (served via /api/prompts)
    ├── start.bat                      ← Windows one-click installer
    ├── package.json
    └── .env
```

## Quick Start

### 1. Run the app on your PC

```bash
git clone https://github.com/HassanArif-collab/Content-Prompts-for-AI.git
cd Content-Prompts-for-AI/content-app

# Double-click start.bat on Windows (auto-installs everything)
# OR manually:
bun install
bun run db:push
bun run dev
```

App opens at http://localhost:3000

### 2. Start the Cloudflare tunnel

In the app, click "Start tunnel" in the top banner. Copy the public URL.

### 3. Connect your AI chat

Paste the tunnel URL in your AI chat. Then tell the AI:
- For visual plans: "Read visual-v7-glm/v7/Visuals Generation Prompt v7.md and execute"
- For scripts: "Read script-v5/Script Generation Prompt v5.md and execute"

## Key Documentation

- APP-CONNECTION-PROTOCOL.md — Full API reference for any AI agent
- CODEX-AGENT-PLAN.md — Detailed plan for the Codex agent

## Syncing Prompts

Canonical prompts: prompts/ (repo root)
App copy: content-app/prompts/ (served via /api/prompts)

When you update prompts, sync:
```bash
rm -rf content-app/prompts
cp -r prompts content-app/prompts
```

## License

Private — for the owner's use only.
