// Bridge to the user's browser automation tools.
// Spawns `node tools/browser/browser_task.js <task.json>` and returns the result.
// Used by the AI (in this chat) to drive Dreamina/Flow/etc via the user's logged-in Edge.
//
// The tools/ folder has an organized structure:
//   tools/browser/browser_task.js    — main entry, runs capability tasks
//   tools/browser/browser_scout.js   — UI scouting
//   tools/browser/edge_keepopen.js   — launches Edge with CDP port 9222
//   tools/dreamina/                  — Dreamina-specific probes
//   tools/routing/                   — tool/capability routing
//
// Ponytail: thin wrapper, no abstraction. The tools/ scripts do the real work.

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const exec = promisify(execFile)

const TOOLS_DIR = path.join(process.cwd(), 'tools')
const TASKS_DIR = path.join(process.cwd(), 'qa', 'browser_tasks')

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    capability: string
    url?: string
    inputs?: Record<string, unknown>
    allow_credit_spend?: boolean
    // Optional: if true, run scout first when UI is unknown
    scout_if_needed?: boolean
  }

  if (!body.capability) {
    return NextResponse.json({ error: 'capability required' }, { status: 400 })
  }

  // Check tools/ exists (organized folder structure)
  const taskScript = path.join(TOOLS_DIR, 'browser', 'browser_task.js')
  if (!existsSync(taskScript)) {
    return NextResponse.json({
      error: 'tools/browser/browser_task.js not found. The tools/ folder must be in the project root with the organized structure (browser/, dreamina/, routing/).',
      path: taskScript,
    }, { status: 500 })
  }

  // Build task JSON
  const task = {
    capability: body.capability,
    url: body.url,
    inputs: body.inputs ?? {},
    allow_credit_spend: Boolean(body.allow_credit_spend),
  }

  // Write task file
  await mkdir(TASKS_DIR, { recursive: true })
  const taskPath = path.join(TASKS_DIR, `task-${Date.now()}.json`)
  await writeFile(taskPath, JSON.stringify(task, null, 2), 'utf8')

  // Spawn browser_task.js
  try {
    // 90s timeout — browser tasks can be slow (page load + observe + 5s wait)
    const { stdout, stderr } = await exec('node', [taskScript, taskPath, ...(body.scout_if_needed ? ['--scout-if-needed'] : [])], {
      cwd: process.cwd(),
      timeout: 90_000,
      maxBuffer: 5 * 1024 * 1024,
      env: { ...process.env },
    })

    // The script writes a result JSON to qa/browser_ui_maps/last_browser_task_result.json
    // and also prints it to stdout
    let result: Record<string, unknown> = { raw: stdout }
    try {
      result = JSON.parse(stdout)
    } catch {
      // Try reading the result file
      const resultFile = path.join(process.cwd(), 'qa', 'browser_ui_maps', 'last_browser_task_result.json')
      if (existsSync(resultFile)) {
        const fileContent = await readFile(resultFile, 'utf8')
        result = { ...JSON.parse(fileContent), stderr }
      }
    }

    return NextResponse.json({ ok: true, result, taskPath })
  } catch (err) {
    const e = err as { stderr?: string; message: string; killed?: boolean; code?: number }
    const errorMessage = e.killed
      ? 'Browser task timed out (90s). The page may be slow or login required.'
      : `Browser task failed: ${e.message}`
    return NextResponse.json({
      ok: false,
      error: errorMessage,
      stderr: e.stderr?.slice(0, 2000),
      taskPath,
    }, { status: 500 })
  }
}

// GET: check if Edge CDP is reachable (health check)
export async function GET() {
  const cdpUrl = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222'
  try {
    const res = await fetch(`${cdpUrl}/json/version`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json() as { Browser?: string }
      return NextResponse.json({
        ok: true,
        cdp: cdpUrl,
        browser: data.Browser ?? 'unknown',
        message: 'Edge CDP is reachable. Browser automation is ready.',
      })
    }
    return NextResponse.json({
      ok: false,
      cdp: cdpUrl,
      message: 'Edge CDP responded but not OK. Run: node tools/edge_keepopen.js',
    })
  } catch {
    return NextResponse.json({
      ok: false,
      cdp: cdpUrl,
      message: 'Edge CDP not reachable. Run: node tools/edge_keepopen.js (in a separate terminal, leave it running)',
    })
  }
}
