# App Connection Protocol — For Any AI Agent

> This file teaches any AI agent (GLM, Claude, Mistral, etc.) how to connect to the Documentary Studio app.

## What this is

The Documentary Studio app runs on the user's Windows 11 PC. It has:
- A SQLite database with projects, scripts, research, scenes, sources, tasks, visual plans
- An AI co-pilot (Ollama local, or ZAI cloud in sandbox)
- Browser automation tools (Dreamina, Google Flow via Edge CDP)
- A Visual Plans review tab where the user approves/feedbacks

You (the AI agent in any chat) connect to it via a Cloudflare tunnel URL the user gives you.

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

## API endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/tunnel/status` | GET | Check if tunnel is running |
| `/api/projects` | GET | List all projects |
| `/api/projects/<id>` | GET | Get one project with all data |
| `/api/projects/<id>/script` | GET | Get script sections (always fetch fresh) |
| `/api/projects/<id>/research` | GET | Get research notes (hierarchical tree) |
| `/api/projects/<id>/research` | POST | Add research topic or child link |
| `/api/projects/<id>/sources` | GET | Get source library |
| `/api/projects/<id>/sources` | POST | Add a source |
| `/api/projects/<id>/visual-plans` | GET | List visual plans |
| `/api/projects/<id>/visual-plans` | POST | Create a visual plan |
| `/api/visual-plans/<planId>` | GET | Get one plan |
| `/api/visual-plans/<planId>` | PATCH | Update plan (shots, status, code, feedback) |
| `/api/visual-plans/<planId>` | DELETE | Delete a plan |
| `/api/ai/browse/run_task` | GET | Health check Edge CDP |
| `/api/ai/browse/run_task` | POST | Spawn a browser task (Dreamina/Flow/article) |
| `/api/ai/chat` | POST | Streaming chat with AI co-pilot |
| `/api/ai/settings` | GET/POST | AI provider settings (ZAI/Ollama) |
| `/api/prompts` | GET | List all prompt folders/files |
| `/api/prompts/<folder>/<file>` | GET | Read a specific prompt file |
| `/api/seed` | POST | Seed sample documentary data |

## Visual plan JSON shape

```json
{
  "title": "Visual plan — Act I: The Basement",
  "status": "in_review",
  "scriptSnapshot": "<exact script text this plan is based on>",
  "scriptSectionId": "",
  "shotsJson": "[{...}, {...}]",
  "feedbackJson": "[]",
  "remotionCode": "",
  "remotionPreview": "",
  "browserTasksJson": "[]"
}
```

## Shot object shape

```json
{
  "id": "shot-001",
  "archetype": "STAT_COUNTER",
  "duration": 5.0,
  "visual": "What appears on screen",
  "motion": "How it moves (fade/scale/translate/morph)",
  "textOverlay": "Optional text shown",
  "narration": "The script line this shot covers",
  "asset": {
    "capability": "dreamina.still_image",
    "prompt": "The prompt for the browser tool",
    "status": "pending",
    "path": ""
  }
}
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

Response includes `status`:
- `READY_FOR_AUTHORIZED_EXECUTION` — UI is ready, re-push with `allow_credit_spend: true` after user approval
- `LOW_CONFIDENCE_UI` — run scout first (`tools/browser/browser_scout.js`)
- `CREDIT_SPEND_NOT_AUTHORIZED` — same as ready, just emphasizing the gate
- `PENDING` — still observing

## Feedback object shape

```json
{
  "role": "user",
  "content": "Shot 3 is too long. Make it 4s not 6s.",
  "timestamp": "2026-06-26T12:34:56.789Z"
}
```

Roles: `user` (the human), `ai` (your responses), `system` (status changes like "approved").

## Status flow

```
draft → in_review → approved → rendered
                ↘ changes_requested → in_review (loop)
```

- `draft`: you created it, haven't asked for review yet
- `in_review`: pushed to app, waiting for user
- `changes_requested`: user gave feedback, you need to update
- `approved`: user clicked Approve — you can now generate code + assets
- `rendered`: you've pushed final code + preview

## The script + research push protocol (for Script Gen v4)

After generating a script:

1. Push research as hierarchical topics + child links:
   ```
   POST /api/projects/<id>/research
   { "parentId": null, "title": "Topic name", "url": "", "category": "context" }
   ```
   Then for each source under that topic:
   ```
   POST /api/projects/<id>/research
   { "parentId": "<topic_id>", "title": "Source title | Publisher", "url": "https://...", "category": "fact-check" }
   ```

2. Push script sections:
   ```
   POST /api/projects/<id>/script
   { "type": "act", "heading": "ACT I", "content": "Narration with [1][2] footnotes" }
   ```

3. Push sources (for the footnote references):
   ```
   POST /api/projects/<id>/sources
   { "type": "article", "title": "...", "url": "...", "citation": "APA citation", "credibility": 4 }
   ```

The app renders `[1]` footnotes as clickable links that open in a sidebar showing:
- The source URL
- An AI summarize button
- A chat-about-this-source button

So every `[N]` in the script MUST map to a source you push.

## Error handling

- If tunnel is down → tell user to restart it in the app
- If Ollama fails → tell user to check `ollama serve` is running
- If browser task fails → check Edge CDP health (`GET /api/ai/browse/run_task`)
- If Prisma errors → tell user to run `bun run db:push`
- Never retry more than 3 times → ask user for help
