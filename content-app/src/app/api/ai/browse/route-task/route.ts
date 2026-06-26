// Routes a visual task to the right tool using visual_tool_router.js
// Input: { task: { archetype, durationSeconds, keyframes, references, startFrame, endFrame, model, need, intent, ... } }
// Output: { routed: { tool, capability, reason, requiresBrowserAuth, ... } }

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { runTool, QA_DIR } from '@/lib/tool-runner'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    task: Record<string, unknown>
  }

  if (!body.task) {
    return NextResponse.json({ error: 'task required' }, { status: 400 })
  }

  // Write task to temp file (visual_tool_router.js reads from file)
  await mkdir(QA_DIR, { recursive: true })
  const taskPath = path.join(QA_DIR, `route-task-${Date.now()}.json`)
  await writeFile(taskPath, JSON.stringify(body.task), 'utf8')

  // Run visual_tool_router.js with the task file
  const result = await runTool('routing/visual_tool_router.js', [taskPath], 15_000)

  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      error: result.error,
      stderr: result.stderr?.slice(0, 2000),
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    routed: result.parsed,
    raw: result.stdout,
  })
}

// Self-test endpoint
export async function GET() {
  const result = await runTool('routing/visual_tool_router.js', ['--self-test'], 10_000)
  return NextResponse.json({
    ok: result.ok,
    output: result.stdout.trim() || result.stderr.trim(),
  })
}
