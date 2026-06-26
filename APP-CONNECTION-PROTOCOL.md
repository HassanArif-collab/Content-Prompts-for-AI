# App Connection Protocol — For Any AI Agent

> This file teaches any AI agent (GLM, Claude, Mistral, etc.) how to connect to the Documentary Studio app.

## What this is

The Documentary Studio app runs on the user's Windows 11 PC. It has:
- A SQLite database with projects, scripts, research, scenes, sources, tasks, visual plans
- An AI co-pilot (Ollama local, or ZAI cloud in sandbox)
- Browser automation tools (Dreamina, Google Flow via Edge CDP)
- A Visual Plans review tab where the user approves/feedbacks
- A prompts library (served via /api/prompts)

You (the AI agent in any chat) connect to it via a Cloudflare tunnel URL the user gives you.

## Repository Structure

```
Content-Prompts-for-AI/
├── prompts/                    ← Canonical prompts (GitHub source of truth)
│   ├── script-v5/
│   ├── visual-v7-glm/
│   └── ...
└── content-app/                ← The Documentary Studio app
    ├── src/                    ← App source
    ├── tools/                  ← Browser automation (inside the app)
    ├── prompts/                ← Copy of canonical prompts (served via /api/prompts)
    └── ...
```

The app has its own copy of the prompts at `content-app/prompts/`. When you call `/api/prompts/<folder>/<file>`, the app reads from its local copy. You don't need to worry about the GitHub repo structure — just use the API.

## The connection checklist

1. User gives you a tunnel URL like `https://random-words.trycloudflare.com`
2. Test: `GET <URL>/api/tunnel/status` → should return `{"running": true, "url": "..."}`
3. Get project ID: `GET <URL>/api/projects` → pick the project, note its `id`
4. Fetch script: `GET <URL>/api/projects/<id>/script`
5. Read prompt files: `GET <URL>/api/prompts/<folder>/<file>`
6. Push plan: `POST <URL>/api/projects/<id>/visual-plans`
7. User reviews in app, gives feedback
8. You update: `PATCH <URL>/api/visual-plans/<planId>`
9. For browser assets: `POST <URL>/api/ai/browse/run_task`

## The golden rules

1. **Always fetch the script fresh** — never use a cached version, the user may have edited
2. **Never drive the browser directly** — always use `/api/ai/browse/run_task`
3. **Never push credit-spending browser tasks without explicit user approval**
4. **Push max once per phase** — don't spam the app
5. **Wait for the user's feedback in chat** after pushing a plan for review
6. **Read prompt files via the API** — don't guess what they contain
7. **Tools live inside the app** — you know about them through the guide, but you never run them directly

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tunnel/status` | GET | Check if tunnel is running |
| `/api/projects` | GET | List all projects |
| `/api/projects/<id>` | GET | Get one project with all data |
| `/api/projects/<id>/script` | GET | Get script sections (always fetch fresh) |
| `/api/projects/<id>/research` | GET/POST | Get/add research notes (hierarchical tree) |
| `/api/projects/<id>/sources` | GET/POST | Get/add sources |
| `/api/projects/<id>/visual-plans` | GET/POST | List/create visual plans |
| `/api/visual-plans/<planId>` | GET/PATCH/DELETE | Read/update/delete a plan |
| `/api/ai/browse/run_task` | GET/POST | Health check / spawn browser task |
| `/api/ai/chat` | POST | Streaming chat with AI co-pilot |
| `/api/ai/settings` | GET/POST | AI provider settings (ZAI/Ollama) |
| `/api/prompts` | GET | List all prompt folders/files |
| `/api/prompts/<folder>/<file>` | GET | Read a specific prompt file |
| `/api/seed` | POST | Seed sample documentary data |

## Prompt folders available via API

When you call `/api/prompts`, you'll get:
- `script-v5` — Script Generation v5 (app-connected)
- `script-v4` — Script Generation v4 (original)
- `visual-v7-glm` — Visual Generation v7 for GLM (Remotion + app connection)
- `visual-v6-claude` — Visual Generation v6 for Claude (reference)
- `visual-v6-glm` — Visual Generation v6 for GLM (reference)

Read individual files: `GET /api/prompts/visual-v7-glm/Visuals%20Generation%20Prompt%20v7`

## Visual plan JSON shape

```json
{
  "title": "Visual plan — Act I",
  "status": "in_review",
  "scriptSnapshot": "<exact script text>",
  "shotsJson": "[{...}]",
  "feedbackJson": "[]",
  "remotionCode": "",
  "remotionPreview": "",
  "browserTasksJson": "[]"
}
```

## Status flow

```
draft → in_review → approved → rendered
                ↘ changes_requested → in_review (loop)
```

## Browser task JSON shape

```json
{
  "capability": "dreamina.still_image",
  "url": "https://dreamina.capcut.com/ai-tool/home",
  "inputs": { "prompt": "...", "aspect": "16:9" },
  "allow_credit_spend": false
}
```

Response status:
- `READY_FOR_AUTHORIZED_EXECUTION` — UI ready, re-push with `allow_credit_spend: true` after user approval
- `LOW_CONFIDENCE_UI` — run scout first
- `CREDIT_SPEND_NOT_AUTHORIZED` — ready but gated

## Error handling

- If tunnel is down → tell user to restart it in the app
- If Ollama fails → tell user to check `ollama serve` is running
- If browser task fails → check Edge CDP health (`GET /api/ai/browse/run_task`)
- If Prisma errors → tell user to run `bun run db:push`
- Never retry more than 3 times → ask user for help
